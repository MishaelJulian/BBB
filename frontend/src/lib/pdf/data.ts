// The data the PDFs print: same questions the Python generator asked the database (meetup, venue, discussions with book, author and reader).
import type { Tx } from '../writes'

export interface PdfBook { title: string; author: string; coverUrl: string | null; member: string | null; isGeneral: boolean }
export interface PdfMeetup {
  id: string; number: number; date: string | null; venue: string; description: string | null; photoUrl: string | null; pdfUrl: string | null
  /** Every discussion row that has a book, in the stored order (the classic table prints them all). */
  rows: PdfBook[]
  /** Magazine: books grouped by reader, readers A-Z. */
  readers: { name: string; books: PdfBook[] }[]
  /** Magazine: books with no reader or marked general, each book once. */
  general: PdfBook[]
}

const DEFAULT_VENUE = 'The Bookworm'

/** Python rule, kept as is: a row is "general" when its notes or topic mention "general". Members flagged hidden are not named (they count as no reader). */
export const isGeneralRow = (notes: string | null, topic: string | null) => /general/i.test(notes ?? '') || /general/i.test(topic ?? '')

export function groupBooks(rows: (PdfBook & { bookId: string })[]) {
  const by = new Map<string, PdfBook[]>()
  const general: PdfBook[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (r.isGeneral || !r.member) {
      if (!seen.has(r.bookId)) { seen.add(r.bookId); general.push(r) }
    } else {
      const l = by.get(r.member) ?? []
      l.push(r)
      by.set(r.member, l)
    }
  }
  // Python sorted() compares code points; so does the default JS sort.
  const readers = [...by.keys()].sort().map((name) => ({ name, books: by.get(name)! }))
  return { readers, general }
}

export async function loadPdfMeetup(tx: Tx, number: number): Promise<PdfMeetup | null> {
  const [m] = await tx<{ id: string; date: string | null; description: string | null; photo_url: string | null; pdf_url: string | null; venue: string | null }[]>`
    select m.id, m.date::text as date, m.description, m.photo_url, m.pdf_url, v.name as venue
    from meetups m left join venues v on v.id = m.venue_id where m.meetup_number = ${number}`
  if (!m) return null
  const disc = await tx<{ book_id: string; title: string; author: string | null; cover: string | null; thumb: string | null; member: string | null; notes: string | null; topic: string | null }[]>`
    select b.id as book_id, b.title, a.full_name as author, b.cover_url as cover, b.thumbnail_url as thumb,
           case when mem.is_hidden then null else mem.display_name end as member, d.notes, d.topic
    from discussions d
    join canonical_books b on b.id = d.canonical_book_id
    left join authors a on a.id = b.author_id
    left join members mem on mem.id = d.member_id
    where d.meetup_id = ${m.id}
    order by d.ctid`
  const all = disc.map((r) => ({
    bookId: r.book_id, title: r.title, author: r.author || 'Unknown', coverUrl: r.cover || r.thumb || null,
    member: r.member || null, isGeneral: isGeneralRow(r.notes, r.topic),
  }))
  const { readers, general } = groupBooks(all)
  return {
    id: m.id, number, date: m.date, venue: m.venue || DEFAULT_VENUE, description: m.description, photoUrl: m.photo_url, pdfUrl: m.pdf_url,
    rows: all, readers, general,
  }
}
