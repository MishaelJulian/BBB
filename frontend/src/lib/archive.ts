// Shared builders ported from app/api/main.py (batch_books_to_dict, meetups_to_dicts, _meetup_dict).
// ponytail: discussions are ordered by ctid = the original SQLite row order (tables were bulk-loaded in order and are never updated); add an explicit seq column if rows are ever updated.
// Default taken: members flagged is_hidden never appear in any public payload (the Python API leaked them in /books and /meetups).
import { sql } from './db'

export interface BookRow {
  id: string; title: string; normalized_title: string; author_id: string | null; author_name: string | null
  cover_url: string | null; thumbnail_url: string | null; description: string | null; goodreads_id: string | null
  publication_year: number | null; rating: number | null; page_count: number | null; media_type: string | null
  series_id: string | null; series_title: string | null; series_position: number | null
}

/** The book columns every payload needs, with author name and series title joined in. Append `where ...` after it. */
export const bookSelect = () => sql()`
  select b.id, b.title, b.normalized_title, b.author_id, a.full_name as author_name, b.cover_url, b.thumbnail_url,
         b.description, b.goodreads_id, b.publication_year, b.rating, b.page_count, b.media_type,
         b.series_id, s.title as series_title, b.series_position
  from canonical_books b
  left join authors a on a.id = b.author_id
  left join series s on s.id = b.series_id`

interface DiscRow {
  book_id: string; topic: string | null; notes: string | null; is_tangent: boolean
  member_id: string | null; member_name: string | null
  meetup_id: string | null; meetup_number: number | null; meetup_date: string | null; venue_name: string | null
}

const GENERAL_OR_TANGENT = /general|tangent/i

export async function booksToDicts(books: BookRow[]) {
  if (books.length === 0) return []
  const db = sql()
  const ids = books.map((b) => b.id)
  const discs = await db<DiscRow[]>`
    select d.canonical_book_id as book_id, d.topic, d.notes, d.is_tangent,
           case when m.is_hidden then null else m.id end as member_id,
           case when m.is_hidden then null else m.display_name end as member_name,
           mt.id as meetup_id, mt.meetup_number, mt.date::text as meetup_date, v.name as venue_name
    from discussions d
    left join members m on m.id = d.member_id
    left join meetups mt on mt.id = d.meetup_id
    left join venues v on v.id = mt.venue_id
    where d.canonical_book_id in ${db(ids)}
    order by d.ctid`

  const proper = new Map<string, number>(), general = new Map<string, number>()
  const members = new Map<string, { id: string; display_name: string }[]>()
  const meetups = new Map<string, { id: string; number: number | null; date: string | null; venue: string | null }[]>()
  const dates = new Map<string, string[]>()
  const seenMembers = new Map<string, Set<string>>(), seenMeetups = new Map<string, Set<string>>()
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)
  const list = <T>(m: Map<string, T[]>, k: string) => m.get(k) ?? m.set(k, []).get(k)!
  const set = (m: Map<string, Set<string>>, k: string) => m.get(k) ?? m.set(k, new Set()).get(k)!

  for (const r of discs) {
    const isGeneral = Boolean((r.topic && GENERAL_OR_TANGENT.test(r.topic)) || (r.notes && GENERAL_OR_TANGENT.test(r.notes)) || r.is_tangent)
    if (isGeneral) { bump(general, r.book_id); continue }
    bump(proper, r.book_id)
    if (r.member_id && !set(seenMembers, r.book_id).has(r.member_id)) {
      set(seenMembers, r.book_id).add(r.member_id)
      list(members, r.book_id).push({ id: r.member_id, display_name: r.member_name || 'Reader' })
    }
    if (r.meetup_id && !set(seenMeetups, r.book_id).has(r.meetup_id)) {
      set(seenMeetups, r.book_id).add(r.meetup_id)
      list(meetups, r.book_id).push({ id: r.meetup_id, number: r.meetup_number, date: r.meetup_date, venue: r.venue_name })
      if (r.meetup_date) list(dates, r.book_id).push(r.meetup_date)
    }
  }

  return books.map((b) => {
    const media = b.media_type || 'book'
    const p = proper.get(b.id) ?? 0, g = general.get(b.id) ?? 0
    const d = [...(dates.get(b.id) ?? [])].sort()
    return {
      id: b.id, title: b.title, normalized_title: b.normalized_title, author_id: b.author_id, author_name: b.author_name,
      cover_url: b.cover_url, thumbnail_url: b.thumbnail_url || b.cover_url, description: b.description, goodreads_id: b.goodreads_id,
      publication_year: b.publication_year, rating: b.rating, page_count: b.page_count, media_type: media,
      series_id: b.series_id, series_title: b.series_title, series_position: b.series_position,
      discussion_count: p > 0 ? p : g,
      first_discussed_date: d[0] ?? null, last_discussed_date: d[d.length - 1] ?? null,
      meetups: meetups.get(b.id) ?? [], members: members.get(b.id) ?? [],
      is_general_discussion: media === 'tangent' || (p === 0 && g > 0),
    }
  })
}

export interface MeetupRow {
  id: string; meetup_number: number; date: string | null; title: string | null; venue_id: string | null
  format: string; photo_url: string | null; pdf_url: string | null
}

export const meetupSelect = () => sql()`
  select m.id, m.meetup_number, m.date::text as date, m.title, m.venue_id, m.format, m.photo_url, m.pdf_url from meetups m`

const GENERAL = /general/i
const byTitle = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export async function meetupsToDicts(meetups: MeetupRow[]) {
  if (meetups.length === 0) return []
  const db = sql()
  const venueIds = [...new Set(meetups.map((m) => m.venue_id).filter((v): v is string => !!v))]
  const venues = venueIds.length ? await db<{ id: string; name: string }[]>`select id, name from venues where id in ${db(venueIds)}` : []
  const discs = await db<{ meetup_id: string; canonical_book_id: string | null; series_id: string | null; member_id: string | null; topic: string | null; notes: string | null }[]>`
    select meetup_id, canonical_book_id, series_id, member_id, topic, notes from discussions
    where meetup_id in ${db(meetups.map((m) => m.id))} order by ctid`
  const bookIds = [...new Set(discs.map((d) => d.canonical_book_id).filter((v): v is string => !!v))]
  const seriesIds = [...new Set(discs.map((d) => d.series_id).filter((v): v is string => !!v))]
  const memberIds = [...new Set(discs.map((d) => d.member_id).filter((v): v is string => !!v))]
  const books = bookIds.length
    ? await db<{ id: string; title: string; author_id: string | null; cover_url: string | null; thumbnail_url: string | null }[]>`
        select id, title, author_id, cover_url, thumbnail_url from canonical_books where id in ${db(bookIds)}` : []
  const series = seriesIds.length ? await db<{ id: string; title: string; author_id: string | null }[]>`select id, title, author_id from series where id in ${db(seriesIds)}` : []
  const authorIds = [...new Set([...books, ...series].map((x) => x.author_id).filter((v): v is string => !!v))]
  const authors = authorIds.length ? await db<{ id: string; full_name: string }[]>`select id, full_name from authors where id in ${db(authorIds)}` : []
  const members = memberIds.length ? await db<{ id: string; display_name: string }[]>`select id, display_name from members where id in ${db(memberIds)} and is_hidden is not true` : []

  const venueName = new Map(venues.map((v) => [v.id, v.name]))
  const bookById = new Map(books.map((b) => [b.id, b]))
  const seriesById = new Map(series.map((s) => [s.id, s]))
  const authorName = new Map(authors.map((a) => [a.id, a.full_name]))
  const memberById = new Map(members.map((m) => [m.id, m]))

  return meetups.map((meetup) => {
    const ds = discs.filter((d) => d.meetup_id === meetup.id)
    const outMembers: { id: string; display_name: string }[] = []
    const seenMember = new Set<string>()
    const addMember = (id: string, name: string) => { if (!seenMember.has(id)) { seenMember.add(id); outMembers.push({ id, display_name: name }) } }

    const groupedBooks = new Map<string, typeof ds>()
    for (const d of ds) if (d.canonical_book_id) (groupedBooks.get(d.canonical_book_id) ?? groupedBooks.set(d.canonical_book_id, []).get(d.canonical_book_id)!).push(d)
    const outBooks: { id: string; title: string; author: string | null; member: string | null; cover_url: string | null; thumbnail_url: string | null; is_discussion_mention: boolean; is_general_discussion: boolean }[] = []
    for (const [bookId, list] of groupedBooks) {
      const book = bookById.get(bookId)
      if (!book) continue
      const names: string[] = []
      for (const d of list) {
        const mem = d.member_id ? memberById.get(d.member_id) : undefined
        if (mem?.display_name) {
          if (!names.includes(mem.display_name)) names.push(mem.display_name)
          addMember(mem.id, mem.display_name)
        }
      }
      const isGen = list.some((d) => (d.topic && GENERAL.test(d.topic)) || (d.notes && GENERAL.test(d.notes)))
      outBooks.push({
        id: book.id, title: book.title, author: book.author_id ? authorName.get(book.author_id) ?? null : null,
        member: names.length ? names.join(', ') : null, cover_url: book.cover_url, thumbnail_url: book.thumbnail_url,
        is_discussion_mention: isGen, is_general_discussion: isGen,
      })
    }
    outBooks.sort((a, b) => Number(a.is_discussion_mention) - Number(b.is_discussion_mention) || byTitle((a.title ?? '').toLowerCase(), (b.title ?? '').toLowerCase()))

    // A series mention (a whole series talked about) has no book row; it is listed apart so book_count keeps its meaning.
    const groupedSeries = new Map<string, typeof ds>()
    for (const d of ds) if (d.series_id && seriesById.get(d.series_id)) (groupedSeries.get(d.series_id) ?? groupedSeries.set(d.series_id, []).get(d.series_id)!).push(d)
    const outSeries = [...groupedSeries].map(([sid, list]) => {
      const ser = seriesById.get(sid)!
      const names: string[] = []
      for (const d of list) {
        const mem = d.member_id ? memberById.get(d.member_id) : undefined
        if (mem?.display_name && !names.includes(mem.display_name)) { names.push(mem.display_name); addMember(mem.id, mem.display_name) }
      }
      return {
        id: ser.id, title: ser.title, author: ser.author_id ? authorName.get(ser.author_id) ?? null : null,
        member: names.join(', ') || null,
        is_general_discussion: list.some((d) => (d.topic && GENERAL.test(d.topic)) || (d.notes && GENERAL.test(d.notes))),
      }
    }).sort((a, b) => byTitle(a.title.toLowerCase(), b.title.toLowerCase()))

    return {
      id: meetup.id, number: meetup.meetup_number, date: meetup.date, venue: meetup.venue_id ? venueName.get(meetup.venue_id) ?? null : null,
      title: meetup.title, format: meetup.format, book_count: outBooks.length, series_count: outSeries.length, member_count: outMembers.length,
      photo_url: meetup.photo_url, pdf_url: meetup.pdf_url, books: outBooks, series: outSeries, members: outMembers,
    }
  })
}
