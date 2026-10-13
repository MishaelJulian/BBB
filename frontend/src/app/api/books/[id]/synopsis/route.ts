import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1' // next to the Supabase project (ap-south-1)

// A public GET never fetches from the web or writes (S2): missing text falls back to the archive line.
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params
  const db = sql()
  const [b] = await db<{ description: string | null; page_count: number | null; rating: number | null; cover_url: string | null; goodreads_id: string | null }[]>`
    select description, page_count, rating, cover_url, goodreads_id from canonical_books where id = ${id}`
  if (!b) return apiError(404, 'Book not found')
  let description = b.description
  if (!description || description.trim().length <= 20) {
    const nums = await db<{ meetup_number: number }[]>`
      select distinct m.meetup_number from meetups m join discussions d on d.meetup_id = m.id
      where d.canonical_book_id = ${id} and m.meetup_number is not null order by m.meetup_number`
    description = `Featured and discussed by the Bangalore Book Club community${nums.length ? ` at ${nums.map((n) => '#' + n.meetup_number).join(', ')}` : ''}.`
  }
  return ok({ description, page_count: b.page_count, rating: b.rating, cover_url: b.cover_url, source: b.goodreads_id ? 'goodreads' : 'archive' })
})
