// Look-up of book details, done on the server: the site's CSP blocks browser calls to these hosts.
// Open Library first, then Apple Books. A result is accepted only when its title matches the book's title.
// Callers fill EMPTY fields only (see fillable below); nothing that is already there is overwritten.
import { audit } from '../audit'
import type { Caller } from '../session'
import type { Tx } from '../writes'

export interface Found { isbn?: string; year?: number; cover?: string; description?: string; author?: string }
export interface SourceNote { source: string; result: string }
export interface Lookup { found: Found; sources: SourceNote[]; failed: boolean }

const UA = 'BBB-Library-admin/1.0 (brokebibliophilesbangalore@gmail.com)'
const nz = (t: unknown) => String(t ?? '').toLowerCase().split(/[:(]/)[0].replace(/[^a-z0-9]+/g, ' ').trim()
export const sameTitle = (a: unknown, b: unknown) => {
  const x = nz(a), y = nz(b)
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x))
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(7000), cache: 'no-store' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

interface OlDoc { title?: string; author_name?: string[]; isbn?: string[]; cover_i?: number; first_publish_year?: number }
interface Itunes { trackName?: string; artistName?: string; artworkUrl100?: string; releaseDate?: string; description?: string }

export async function lookupBook(title: string, author?: string | null): Promise<Lookup> {
  const found: Found = {}
  const sources: SourceNote[] = []
  let failed = false
  const t = title.trim()
  try {
    const u = `https://openlibrary.org/search.json?title=${encodeURIComponent(t)}${author ? `&author=${encodeURIComponent(author)}` : ''}&limit=5&fields=title,author_name,isbn,cover_i,first_publish_year`
    const docs = (((await getJson(u)) as { docs?: OlDoc[] }).docs ?? []).filter((d) => sameTitle(d.title, t))
    const d = docs.find((x) => x.isbn?.length) ?? docs[0]
    if (d) {
      sources.push({ source: 'Open Library', result: `found "${d.title}"` })
      const i = d.isbn?.find((x) => x.length === 13) ?? d.isbn?.[0]
      if (i) found.isbn = i
      if (d.first_publish_year) found.year = d.first_publish_year
      if (d.cover_i) found.cover = `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
      if (d.author_name?.[0]) found.author = d.author_name[0]
    } else sources.push({ source: 'Open Library', result: 'no match' })
  } catch {
    sources.push({ source: 'Open Library', result: 'did not answer' })
    failed = true
  }
  try {
    const u = `https://itunes.apple.com/search?entity=ebook&limit=1&term=${encodeURIComponent(`${t} ${author ?? ''}`.trim())}`
    const first = ((await getJson(u)) as { results?: Itunes[] }).results?.[0]
    if (first && sameTitle(first.trackName, t)) {
      sources.push({ source: 'Apple Books', result: `found "${first.trackName}"` })
      // Apple's cover host is already allowed by the site's CSP (mzstatic.com); Open Library's is not, so Apple wins when it has one.
      if (first.artworkUrl100) found.cover = first.artworkUrl100.replace('100x100', '600x600')
      if (!found.year && first.releaseDate) found.year = Number(first.releaseDate.slice(0, 4)) || undefined
      if (first.description) found.description = first.description.replace(/<[^>]+>/g, '').slice(0, 1500)
      if (!found.author && first.artistName) found.author = first.artistName
    } else sources.push({ source: 'Apple Books', result: first ? `found "${first.trackName}", not the same book` : 'no match' })
  } catch {
    sources.push({ source: 'Apple Books', result: 'did not answer' })
    failed = true
  }
  return { found, sources, failed }
}

interface BookGaps { id: string; title: string; author: string | null; cover_url: string | null; thumbnail_url: string | null; description: string | null; publication_year: number | null; isbn10: string | null; isbn13: string | null }

/** What a look-up may fill for this book: only the fields that are empty. */
export function fillable(b: BookGaps, f: Found) {
  const out: Record<string, string | number> = {}
  if (!b.cover_url && !b.thumbnail_url && f.cover) { out.cover_url = f.cover; out.thumbnail_url = f.cover }
  if (!b.description && f.description) out.description = f.description
  if (!b.publication_year && f.year) out.publication_year = f.year
  if (!b.isbn10 && !b.isbn13 && f.isbn) out[f.isbn.length === 10 ? 'isbn10' : 'isbn13'] = f.isbn.toUpperCase()
  return out
}

export interface EnrichSummary { total: number; enriched: number; complete: number; none: number; failed: number; failures: { id: string; title: string }[] }

export async function booksOfMeetup(tx: Tx, number: number): Promise<BookGaps[]> {
  return tx<BookGaps[]>`
    select b.id, b.title, a.full_name as author, b.cover_url, b.thumbnail_url, b.description, b.publication_year, b.isbn10, b.isbn13
    from canonical_books b left join authors a on a.id = b.author_id
    where b.id in (select d.canonical_book_id from discussions d join meetups m on m.id = d.meetup_id where m.meetup_number = ${number} and d.canonical_book_id is not null)
    order by b.title`
}

/** Step 2 of a meetup enrich: look up each book (3 at a time), then write the empty fields in one transaction with one audit row. */
export async function enrichBooks(books: BookGaps[], only?: Set<string>) {
  const list = only ? books.filter((b) => only.has(b.id)) : books
  const results: { book: BookGaps; fill: Record<string, string | number>; state: 'enriched' | 'complete' | 'none' | 'failed' }[] = []
  let i = 0
  const worker = async () => {
    while (i < list.length) {
      const b = list[i++]
      const needs = (!b.cover_url && !b.thumbnail_url) || !b.description || !b.publication_year || (!b.isbn10 && !b.isbn13)
      if (!needs) { results.push({ book: b, fill: {}, state: 'complete' }); continue }
      const r = await lookupBook(b.title, b.author)
      const fill = fillable(b, r.found)
      results.push({ book: b, fill, state: Object.keys(fill).length ? 'enriched' : r.failed ? 'failed' : 'none' })
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return results
}

export async function applyEnrich(tx: Tx, who: Caller, number: number, results: Awaited<ReturnType<typeof enrichBooks>>): Promise<EnrichSummary> {
  const sum: EnrichSummary = { total: results.length, enriched: 0, complete: 0, none: 0, failed: 0, failures: [] }
  const changes: { id: string; title: string; filled: string[] }[] = []
  for (const r of results) {
    if (r.state === 'complete') sum.complete++
    else if (r.state === 'none') sum.none++
    else if (r.state === 'failed') { sum.failed++; sum.failures.push({ id: r.book.id, title: r.book.title }) }
    else {
      const f = r.fill
      // re-check emptiness inside the transaction so a concurrent edit is never overwritten
      await tx`update canonical_books set
        cover_url = case when coalesce(cover_url, '') = '' and coalesce(thumbnail_url, '') = '' and ${(f.cover_url as string) ?? null}::text is not null then ${(f.cover_url as string) ?? null}::text else cover_url end,
        thumbnail_url = case when coalesce(cover_url, '') = '' and coalesce(thumbnail_url, '') = '' and ${(f.thumbnail_url as string) ?? null}::text is not null then ${(f.thumbnail_url as string) ?? null}::text else thumbnail_url end,
        description = case when coalesce(description, '') = '' then coalesce(${(f.description as string) ?? null}::text, description) else description end,
        publication_year = case when coalesce(publication_year, 0) = 0 then coalesce(${(f.publication_year as number) ?? null}::int, publication_year) else publication_year end,
        isbn10 = case when coalesce(isbn10, '') = '' and coalesce(isbn13, '') = '' then coalesce(${(f.isbn10 as string) ?? null}::text, isbn10) else isbn10 end,
        isbn13 = case when coalesce(isbn10, '') = '' and coalesce(isbn13, '') = '' then coalesce(${(f.isbn13 as string) ?? null}::text, isbn13) else isbn13 end,
        updated_at = now() where id = ${r.book.id}`
      sum.enriched++
      changes.push({ id: r.book.id, title: r.book.title, filled: Object.keys(f).filter((k) => k !== 'thumbnail_url') })
    }
  }
  if (changes.length) await audit(tx, who, 'meetup.enrich', 'meetups', String(number), null, { meetup: number, books: changes })
  return sum
}
