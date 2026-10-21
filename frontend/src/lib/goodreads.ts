import { sql } from './db'
import { authorId } from './writes'

export interface BookSuggestion {
  id?: string
  title: string
  author: string | null
  creator?: string | null
  media_type?: string
  url?: string | null
  cover_url?: string | null
  thumbnail_url?: string | null
  publication_year?: number | null
  isbn?: string | null
  goodreads_id?: string | null
  rating?: number | null
  ratings_count?: number | null
  num_pages?: number | null
  in_archive?: boolean
  source?: string
  source_label?: string
  description?: string | null
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const suggestionCache = new Map<string, { ts: number; data: BookSuggestion[] }>()

function hostIs(urlStr: string, ...domains: string[]): boolean {
  try {
    const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`)
    const host = u.hostname.toLowerCase()
    return domains.some((d) => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

function isSafePublicUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    if (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h === '::1' ||
      h.endsWith('.local') ||
      h.endsWith('.internal') ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(h) ||
      /^169\.254\./.test(h)
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function searchExternalBooks(q: string): Promise<BookSuggestion[]> {
  const results: BookSuggestion[] = []
  const qClean = q.trim()
  if (!qClean) return results

  // 1. Query Goodreads autocomplete API
  try {
    const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(qClean)}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    if (resp.ok) {
      const data = (await resp.json()) as Record<string, unknown>[]
      if (Array.isArray(data)) {
        for (const item of data.slice(0, 8)) {
          const rawTitle = String(item.bookTitleBare || item.title || '').trim()
          if (!rawTitle) continue
          const low = rawTitle.toLowerCase()
          if (low.includes('study guide') && !qClean.toLowerCase().includes('study guide')) continue
          if (low.includes('summary & study')) continue

          const authorObj = item.author as { name?: string } | undefined
          const author = authorObj?.name ? authorObj.name.replace(/\s+/g, ' ').trim() : null

          const img = typeof item.imageUrl === 'string' ? item.imageUrl : null
          const highImg = img ? img.replace(/\._S[XY]\d+_\./, '._SY450_.') : null

          let rating: number | null = null
          if (item.avgRating !== undefined && item.avgRating !== null) {
            const parsed = Number(item.avgRating)
            if (Number.isFinite(parsed) && parsed > 0) rating = parsed
          }

          const descriptionObj = item.description as { html?: string } | undefined
          const desc =
            typeof descriptionObj?.html === 'string'
              ? descriptionObj.html.replace(/<[^>]+>/g, '').trim().slice(0, 600)
              : null

          results.push({
            title: rawTitle,
            author,
            creator: author,
            cover_url: highImg,
            thumbnail_url: img,
            goodreads_id: item.bookId ? String(item.bookId) : null,
            rating,
            ratings_count: typeof item.ratingsCount === 'number' ? item.ratingsCount : null,
            num_pages: typeof item.numPages === 'number' ? item.numPages : null,
            description: desc,
            url: item.bookUrl ? `https://www.goodreads.com${String(item.bookUrl)}` : null,
            source: 'goodreads',
            source_label: 'Goodreads',
          })
        }
      }
    }
  } catch {
    // Fall through to Apple Books fallback
  }

  // 2. Apple Books fallback if Goodreads returned no results or timed out
  if (results.length === 0) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(qClean)}&entity=ebook&limit=6`
      const resp = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
        cache: 'no-store',
      })
      if (resp.ok) {
        const data = (await resp.json()) as { results?: Record<string, unknown>[] }
        for (const item of data.results ?? []) {
          const img = typeof item.artworkUrl100 === 'string' ? item.artworkUrl100 : null
          const highImg = img ? img.replace('100x100bb', '600x600bb') : null
          let year: number | null = null
          if (typeof item.releaseDate === 'string' && item.releaseDate.length >= 4) {
            const y = parseInt(item.releaseDate.slice(0, 4), 10)
            if (Number.isFinite(y)) year = y
          }
          const title = typeof item.trackName === 'string' ? item.trackName.trim() : ''
          if (!title) continue
          const author = typeof item.artistName === 'string' ? item.artistName.trim() : null
          results.push({
            title,
            author,
            creator: author,
            cover_url: highImg,
            thumbnail_url: img,
            publication_year: year,
            description:
              typeof item.description === 'string'
                ? item.description.replace(/<[^>]+>/g, '').slice(0, 600)
                : null,
            source: 'apple_books',
            source_label: 'Apple Books',
          })
        }
      }
    } catch {
      // Ignore fallback error
    }
  }

  return results
}

export async function resolveMediaUrl(url: string): Promise<BookSuggestion | Record<string, never>> {
  let cleanUrl = url.trim()
  if (!cleanUrl) return {}
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`
  }
  if (!isSafePublicUrl(cleanUrl)) return {}

  let parsedUrl: URL
  try {
    parsedUrl = new URL(cleanUrl)
  } catch {
    return {}
  }

  // 1. YouTube video, shorts, or playlist via official oEmbed
  if (
    hostIs(cleanUrl, 'youtu.be') ||
    (hostIs(cleanUrl, 'youtube.com') &&
      (parsedUrl.pathname.startsWith('/watch') || parsedUrl.pathname.startsWith('/shorts/')))
  ) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      const resp = await fetch(oembedUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(4000),
      })
      if (resp.ok) {
        const data = (await resp.json()) as Record<string, unknown>
        const author = typeof data.author_name === 'string' ? data.author_name : null
        const thumb = typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null
        return {
          media_type: 'youtube',
          title: typeof data.title === 'string' && data.title ? data.title : 'YouTube Video',
          author,
          creator: author,
          thumbnail_url: thumb,
          cover_url: thumb,
          url: cleanUrl,
          source: 'youtube_oembed',
          source_label: 'YouTube Video',
        }
      }
    } catch {
      // Fall through to OpenGraph
    }
  }

  // 2. General OpenGraph & HTML scraper
  try {
    const resp = await fetch(cleanUrl, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(4500),
    })
    const rawHtml = (await resp.text()).slice(0, 400_000)

    const matchMeta = (prop: string): string | null => {
      const r1 = new RegExp(`<meta[^>]+property=['"]${prop}['"][^>]+content=['"](.*?)['"]`, 'i')
      const r2 = new RegExp(`<meta[^>]+content=['"](.*?)['"][^>]+property=['"]${prop}['"]`, 'i')
      const m = rawHtml.match(r1) || rawHtml.match(r2)
      return m?.[1]?.trim() || null
    }

    let title = matchMeta('og:title')
    if (!title) {
      const tm = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i)
      title = tm?.[1]?.trim() || ''
    }
    title = title
      .replace(/\s*-\s*YouTube$/i, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')

    const image = matchMeta('og:image')
    const desc = matchMeta('og:description')
    const siteName = matchMeta('og:site_name')

    let mediaType = 'tangent'
    let creator: string | null = siteName

    if (hostIs(cleanUrl, 'youtube.com', 'youtu.be')) {
      mediaType = 'youtube'
      creator = cleanUrl.includes('@') ? title : 'YouTube'
    } else if (hostIs(cleanUrl, 'imdb.com', 'letterboxd.com')) {
      mediaType = 'movie'
      creator = siteName || 'Cinema'
    } else if (hostIs(cleanUrl, 'goodreads.com')) {
      mediaType = 'book'
    } else if (hostIs(cleanUrl, 'spotify.com', 'podcasts.apple.com')) {
      mediaType = 'podcast'
      creator = siteName || 'Podcast'
    } else {
      const domain = parsedUrl.hostname.replace(/^www\./, '')
      creator = siteName || domain
    }

    const fallbackHost = parsedUrl.hostname.replace(/^www\./, '')
    return {
      media_type: mediaType,
      title: title || fallbackHost,
      author: creator,
      creator,
      thumbnail_url: image,
      cover_url: image,
      description: desc,
      url: cleanUrl,
      source: 'opengraph',
      source_label: siteName || 'Web Resource',
    }
  } catch {
    const domain = parsedUrl.hostname.replace(/^www\./, '')
    const mType = hostIs(cleanUrl, 'youtube.com', 'youtu.be') ? 'youtube' : 'tangent'
    return {
      media_type: mType,
      title: cleanUrl,
      author: domain,
      creator: domain,
      thumbnail_url: null,
      cover_url: null,
      url: cleanUrl,
      source: 'url',
      source_label: domain,
    }
  }
}

export async function searchExternalMedia(q: string, mediaType = 'book'): Promise<BookSuggestion[]> {
  const qClean = q.trim()
  if (!qClean) return []

  if (
    qClean.startsWith('http://') ||
    qClean.startsWith('https://') ||
    hostIs(`https://${qClean}`, 'youtube.com', 'youtu.be')
  ) {
    const resolved = await resolveMediaUrl(qClean)
    return 'title' in resolved && resolved.title ? [resolved as BookSuggestion] : []
  }

  if (['movie', 'show', 'cinema', 'tv', 'tv_series', 'anime', 'documentary'].includes(mediaType)) {
    const results: BookSuggestion[] = []
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(`${qClean} film`)}&format=json`
      const resp = await fetch(ddgUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(3500),
      })
      if (resp.ok) {
        const data = (await resp.json()) as Record<string, unknown>
        const heading = typeof data.Heading === 'string' ? data.Heading : ''
        const abstract = typeof data.AbstractText === 'string' ? data.AbstractText : ''
        const image = typeof data.Image === 'string' ? data.Image : ''
        if (heading) {
          const imgUrl = image && image.startsWith('/') ? `https://duckduckgo.com${image}` : image || null
          const ym = abstract.match(/\b(19\d\d|20\d\d)\b/)
          const year = ym ? parseInt(ym[1], 10) : null
          const cleanTitle = heading.replace(/\s*\((film|movie|TV series)\)/i, '').trim()
          results.push({
            title: cleanTitle,
            author: 'Film',
            creator: 'Film',
            publication_year: year,
            cover_url: imgUrl,
            thumbnail_url: imgUrl,
            description: abstract ? abstract.slice(0, 250) : null,
            media_type: 'movie',
            source: 'duckduckgo',
            source_label: 'Film / Cinema',
          })
        }
      }
    } catch {
      // Ignore DDG error
    }

    try {
      const tvUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(qClean)}`
      const resp = await fetch(tvUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(3500),
      })
      if (resp.ok) {
        const data = (await resp.json()) as { show?: Record<string, unknown> }[]
        for (const item of data.slice(0, 4)) {
          const s = item.show ?? {}
          const net = (s.network || s.webChannel) as { name?: string } | undefined
          const network = net?.name || 'TV Series'
          const imgObj = s.image as { medium?: string } | undefined
          const img = imgObj?.medium || null
          let year: number | null = null
          if (typeof s.premiered === 'string' && s.premiered.length >= 4) {
            const y = parseInt(s.premiered.slice(0, 4), 10)
            if (Number.isFinite(y)) year = y
          }
          const name = typeof s.name === 'string' ? s.name : ''
          if (!name) continue
          results.push({
            title: name,
            author: network,
            creator: network,
            publication_year: year,
            cover_url: img,
            thumbnail_url: img,
            description:
              typeof s.summary === 'string'
                ? s.summary.replace(/<[^>]+>/g, '').slice(0, 250)
                : null,
            media_type: 'movie',
            source: 'tvmaze',
            source_label: 'TV Series',
          })
        }
      }
    } catch {
      // Ignore TVMaze error
    }
    return results
  }

  if (mediaType === 'podcast') {
    const results: BookSuggestion[] = []
    try {
      const podUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(qClean)}&media=podcast&limit=6`
      const resp = await fetch(podUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(3500),
      })
      if (resp.ok) {
        const data = (await resp.json()) as { results?: Record<string, unknown>[] }
        for (const r of data.results ?? []) {
          const img =
            (typeof r.artworkUrl600 === 'string' ? r.artworkUrl600 : null) ||
            (typeof r.artworkUrl100 === 'string' ? r.artworkUrl100 : null)
          const title = typeof r.collectionName === 'string' ? r.collectionName : ''
          if (!title) continue
          const author = typeof r.artistName === 'string' ? r.artistName : null
          results.push({
            title,
            author,
            creator: author,
            cover_url: img,
            thumbnail_url: img,
            url:
              (typeof r.trackViewUrl === 'string' ? r.trackViewUrl : null) ||
              (typeof r.feedUrl === 'string' ? r.feedUrl : null),
            media_type: 'podcast',
            source: 'apple_podcasts',
            source_label: 'Apple Podcasts',
          })
        }
      }
    } catch {
      // Ignore podcast error
    }
    return results
  }

  if (mediaType === 'youtube' || mediaType === 'video') {
    return [
      {
        title: qClean,
        author: 'YouTube Channel / Creator',
        creator: 'YouTube',
        media_type: 'youtube',
        source: 'custom',
        source_label: 'YouTube',
      },
    ]
  }

  return searchExternalBooks(qClean)
}

export async function suggestMedia(q: string, mediaType = 'book'): Promise<BookSuggestion[]> {
  const qClean = q.trim()
  if (qClean.length < 2) return []

  const cacheKey = `${mediaType}:${qClean.toLowerCase()}`
  const now = Date.now()
  const cached = suggestionCache.get(cacheKey)
  if (cached && now - cached.ts < 600_000) {
    return cached.data
  }

  if (mediaType !== 'book') {
    const results = await searchExternalMedia(qClean, mediaType)
    suggestionCache.set(cacheKey, { ts: now, data: results })
    return results
  }

  const db = sql()
  const suggestions: BookSuggestion[] = []
  const seenKeys = new Set<string>()

  try {
    const pattern = `%${qClean}%`
    const localBooks = await db<
      {
        id: string
        title: string
        author: string | null
        cover_url: string | null
        thumbnail_url: string | null
        publication_year: number | null
        isbn13: string | null
        isbn10: string | null
        rating: number | null
        goodreads_id: string | null
        media_type: string | null
      }[]
    >`
      select b.id, b.title, a.full_name as author, b.cover_url, b.thumbnail_url, b.publication_year, b.isbn13, b.isbn10, b.rating, b.goodreads_id, b.media_type
      from canonical_books b
      left join authors a on a.id = b.author_id
      where b.title ilike ${pattern} or b.normalized_title ilike ${pattern} or a.full_name ilike ${pattern}
      limit 4
    `

    for (const b of localBooks) {
      const normKey = `${b.title.toLowerCase().trim()}|${(b.author || '').toLowerCase().trim()}`
      seenKeys.add(normKey)
      suggestions.push({
        id: b.id,
        title: b.title,
        author: b.author,
        creator: b.author,
        cover_url: b.cover_url || b.thumbnail_url,
        thumbnail_url: b.thumbnail_url || b.cover_url,
        publication_year: b.publication_year,
        isbn: b.isbn13 || b.isbn10,
        rating: b.rating,
        goodreads_id: b.goodreads_id,
        media_type: b.media_type || 'book',
        in_archive: true,
        source: 'archive',
        source_label: 'In BBB Archive',
      })
    }
  } catch {
    // Continue to Goodreads even if local query fails
  }

  const externalResults = await searchExternalBooks(qClean)
  for (const ext of externalResults) {
    const normKey = `${ext.title.toLowerCase().trim()}|${(ext.author || '').toLowerCase().trim()}`
    if (!seenKeys.has(normKey)) {
      seenKeys.add(normKey)
      ext.in_archive = false
      ext.media_type = 'book'
      suggestions.push(ext)
      if (suggestions.length >= 8) break
    }
  }

  suggestionCache.set(cacheKey, { ts: now, data: suggestions })
  return suggestions
}

const JUNK_NAMES = new Set([
  'bibliophiles bangalore',
  'bangalore',
  'name',
  'people',
  'discussed',
  'books mentioned',
  'mentions',
  'qissa comics',
])

export async function suggestMembers(q?: string | null, bookId?: string | null) {
  const db = sql()
  const rows = await db<{ id: string; display_name: string; normalized_name: string; disc_count: number }[]>`
    select m.id, m.display_name, m.normalized_name,
      count(distinct d.canonical_book_id)::int as disc_count
    from members m
    left join discussions d on d.member_id = m.id
    group by m.id, m.display_name, m.normalized_name
  `

  let filtered = rows.filter((r) => !JUNK_NAMES.has((r.normalized_name || '').toLowerCase()))
  const qClean = (q ?? '').trim().toLowerCase()
  if (qClean) {
    filtered = filtered
      .filter(
        (r) =>
          r.display_name.toLowerCase().includes(qClean) ||
          (r.normalized_name || '').toLowerCase().includes(qClean)
      )
      .sort((a, b) => {
        const aStarts = a.display_name.toLowerCase().startsWith(qClean) ? 0 : 1
        const bStarts = b.display_name.toLowerCase().startsWith(qClean) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        if ((b.disc_count || 0) !== (a.disc_count || 0)) return (b.disc_count || 0) - (a.disc_count || 0)
        return a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase())
      })
      .slice(0, 15)
  } else {
    filtered = filtered
      .sort((a, b) => {
        if ((b.disc_count || 0) !== (a.disc_count || 0)) return (b.disc_count || 0) - (a.disc_count || 0)
        return a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase())
      })
      .slice(0, 15)
  }

  let readByMember = new Map<string, number[]>()
  if (bookId && filtered.length > 0) {
    try {
      const past = await db<{ member_id: string; meetup_number: number }[]>`
        select distinct d.member_id, mt.meetup_number
        from discussions d
        join meetups mt on mt.id = d.meetup_id
        where d.canonical_book_id = ${bookId} and d.member_id is not null
      `
      for (const p of past) {
        if (!p.member_id || p.meetup_number == null) continue
        const list = readByMember.get(p.member_id) ?? []
        if (!list.includes(p.meetup_number)) list.push(p.meetup_number)
        readByMember.set(p.member_id, list)
      }
    } catch {
      readByMember = new Map()
    }
  }

  return filtered.map((m) => {
    const meetups = (readByMember.get(m.id) ?? []).sort((a, b) => a - b)
    const count = Number(m.disc_count || 0)
    return {
      id: m.id,
      name: m.display_name,
      discussions_count: count,
      books_count: count,
      already_read: meetups.length > 0,
      already_read_meetups: meetups,
    }
  })
}

export async function enrichSingleBookFromGoodreads(bookId: string, force = false) {
  const db = sql()
  const [book] = await db<
    {
      id: string
      title: string
      author_id: string | null
      author: string | null
      cover_url: string | null
      thumbnail_url: string | null
      goodreads_id: string | null
      rating: number | null
      publication_year: number | null
      description: string | null
    }[]
  >`
    select b.id, b.title, b.author_id, a.full_name as author, b.cover_url, b.thumbnail_url, b.goodreads_id, b.rating, b.publication_year, b.description
    from canonical_books b
    left join authors a on a.id = b.author_id
    where b.id = ${bookId}
    limit 1
  `
  if (!book) return { success: false, message: 'Book not found' }
  if (!force && book.goodreads_id && book.cover_url) {
    return { success: true, book_id: book.id, title: book.title, already_enriched: true }
  }

  const titleClean = book.title.trim()
  if (titleClean.includes('@') || titleClean.toLowerCase().includes('participants') || titleClean.length < 2) {
    return { success: false, message: 'Skipped invalid title' }
  }

  const queryTitle = titleClean.replace(/[\u2018\u2019\u201c\u201d]/g, "'")
  const query = book.author ? `${queryTitle} ${book.author}` : queryTitle
  let results = await searchExternalBooks(query)
  if (results.length === 0 && book.author) {
    results = await searchExternalBooks(queryTitle)
  }
  if (results.length === 0) {
    return { success: false, message: 'No Goodreads results found' }
  }

  const badPhrases = ['summary of', 'summary & study', 'study guide', 'analysis of', 'workbook for', 'trivia-on-books', 'summary:']
  const filtered = results.filter((r) => {
    const t = (r.title || '').toLowerCase()
    return !badPhrases.some((bad) => t.includes(bad))
  })
  const candidates = filtered.length > 0 ? filtered : results
  let best = candidates[0]

  if (book.author) {
    const authTokens = book.author
      .toLowerCase()
      .split(/\W+/)
      .filter((tok) => tok.length > 2)
    for (const c of candidates) {
      const cAuth = (c.author || '').toLowerCase()
      if (authTokens.some((tok) => cAuth.includes(tok))) {
        best = c
        break
      }
    }
  }

  const cover = best.cover_url || book.cover_url
  const thumb = best.thumbnail_url || best.cover_url || book.thumbnail_url
  const rating = best.rating ?? book.rating
  const goodreadsId = best.goodreads_id || book.goodreads_id
  const pubYear = best.publication_year ?? book.publication_year
  const desc = book.description || best.description || null

  let aid = book.author_id
  if (!aid && best.author) {
    aid = await db.begin((tx) => authorId(tx, best.author!.trim()))
  }

  await db`
    update canonical_books set
      cover_url = ${cover},
      thumbnail_url = ${thumb},
      rating = ${rating}::float8,
      goodreads_id = ${goodreadsId},
      publication_year = ${pubYear}::int,
      description = ${desc},
      author_id = ${aid},
      updated_at = now()
    where id = ${book.id}
  `

  return {
    success: true,
    book_id: book.id,
    title: book.title,
    matched_title: best.title,
    author: best.author,
    cover_url: cover,
    rating,
    goodreads_id: goodreadsId,
    publication_year: pubYear,
  }
}

export async function enrichMeetupBooksFromGoodreads(meetupNumber: number) {
  const db = sql()
  const [meetup] = await db<{ id: string }[]>`select id from meetups where meetup_number = ${meetupNumber} limit 1`
  if (!meetup) return null

  const discs = await db<{ canonical_book_id: string | null }[]>`
    select distinct canonical_book_id from discussions where meetup_id = ${meetup.id} and canonical_book_id is not null
  `
  const bookIds = discs.map((d) => d.canonical_book_id).filter((id): id is string => Boolean(id))
  const totalBooks = bookIds.length
  let enrichedCount = 0

  let idx = 0
  const worker = async () => {
    while (idx < bookIds.length) {
      const bId = bookIds[idx++]
      try {
        const res = await enrichSingleBookFromGoodreads(bId, false)
        if (res.success) enrichedCount++
      } catch {
        // Ignore single book failure
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])

  return {
    success: true,
    meetup_number: meetupNumber,
    total_books: totalBooks,
    enriched_count: enrichedCount,
    message: `Enriched ${enrichedCount} of ${totalBooks} books in Meetup #${meetupNumber} from Goodreads`,
  }
}
