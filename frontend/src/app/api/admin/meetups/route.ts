import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { checkAdmin } from '@/lib/admin'
import { apiError, ok, route } from '@/lib/http'
import { adminRoute } from '@/lib/handlers'
import { createMeetup } from '@/lib/ops'

export const dynamic = 'force-dynamic'

const GENERAL = /general/i
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const text = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Read-only port of GET /admin/meetups: every meetup with its editable book rows. Admins only; admins see hidden members' names.
export const GET = route(async (req: NextRequest) => {
  const who = await checkAdmin(req)
  if (who.status === 'unauthenticated') return apiError(401, 'Sign in to continue.', NO_STORE)
  if (who.status === 'forbidden') return apiError(403, 'Admin privileges required.', NO_STORE)

  const db = sql()
  const meetups = await db<{ id: string; number: number; date: string | null; venue: string | null; title: string | null; photo_url: string | null; pdf_url: string | null }[]>`
    select m.id, m.meetup_number as number, m.date::text as date, v.name as venue, m.title, m.photo_url, m.pdf_url
    from meetups m left join venues v on v.id = m.venue_id order by m.meetup_number desc`
  const discs = await db<{ id: string; meetup_id: string; canonical_book_id: string | null; member_id: string | null; topic: string | null; notes: string | null; is_tangent: boolean; external_url: string | null }[]>`
    select id, meetup_id, canonical_book_id, member_id, topic, notes, is_tangent, external_url from discussions order by ctid`
  const books = await db<{ id: string; title: string; author: string | null; media_type: string | null; external_url: string | null; cover_url: string | null; thumbnail_url: string | null; rating: number | null; publication_year: number | null; goodreads_id: string | null }[]>`
    select b.id, b.title, a.full_name as author, b.media_type, b.external_url, b.cover_url, b.thumbnail_url, b.rating, b.publication_year, b.goodreads_id
    from canonical_books b left join authors a on a.id = b.author_id`
  const members = await db<{ id: string; display_name: string }[]>`select id, display_name from members`

  type Disc = (typeof discs)[number]
  const bookById = new Map(books.map((b) => [b.id, b]))
  const memberById = new Map(members.map((m) => [m.id, m.display_name]))
  const discsByMeetup = new Map<string, Disc[]>()
  for (const d of discs) (discsByMeetup.get(d.meetup_id) ?? discsByMeetup.set(d.meetup_id, []).get(d.meetup_id)!).push(d)

  return ok(
    meetups.map((m) => {
      const grouped = new Map<string, Disc[]>()
      for (const d of discsByMeetup.get(m.id) ?? []) {
        if (d.canonical_book_id) (grouped.get(d.canonical_book_id) ?? grouped.set(d.canonical_book_id, []).get(d.canonical_book_id)!).push(d)
      }
      const list = [...grouped.values()].flatMap((ds) => {
        const book = bookById.get(ds[0].canonical_book_id!)
        if (!book) return []
        const names: string[] = []
        for (const d of ds) {
          const n = d.member_id ? memberById.get(d.member_id) : undefined
          if (n && !names.includes(n)) names.push(n)
        }
        return [{
          discussion_id: ds[0].id, discussion_ids: ds.map((d) => d.id), book_id: book.id, title: book.title, author: book.author,
          member: names.length ? names.join(', ') : null, notes: ds.find((d) => d.notes)?.notes ?? null,
          is_general_discussion: ds.some((d) => (d.notes && GENERAL.test(d.notes)) || (d.topic && GENERAL.test(d.topic))),
          media_type: book.media_type || 'book', is_tangent: ds.some((d) => d.is_tangent),
          url: ds[0].external_url || book.external_url, cover_url: book.cover_url || book.thumbnail_url,
          thumbnail_url: book.thumbnail_url || book.cover_url, rating: book.rating, publication_year: book.publication_year, goodreads_id: book.goodreads_id,
        }]
      })
      list.sort((a, b) => Number(a.is_general_discussion) - Number(b.is_general_discussion) || text((a.title ?? '').toLowerCase(), (b.title ?? '').toLowerCase()))
      return { id: m.id, number: m.number, date: m.date, venue: m.venue, title: m.title, photo_url: m.photo_url, pdf_url: m.pdf_url, books_count: list.length, books: list }
    }),
    NO_STORE,
  )
})

// Create a meetup (the next number unless one is given).
export const POST = adminRoute((tx, who, _p, body) => createMeetup(tx, who, body))
