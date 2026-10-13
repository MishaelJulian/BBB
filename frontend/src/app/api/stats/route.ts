import { sql } from '@/lib/db'
import { ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1' // next to the Supabase project (ap-south-1)

export const GET = route(async () => {
  const [s] = await sql()<Record<string, number>[]>`
    select (select count(*)::int from meetups) as total_meetups,
           (select coalesce(max(meetup_number), 0)::int from meetups) as meetups_expected,
           (select count(*)::int from canonical_books) as canonical_books,
           (select count(distinct canonical_book_id)::int from discussions) as books_discussed,
           (select count(*)::int from imported_books) as imported_books,
           (select count(*)::int from authors) as authors,
           (select count(*)::int from members) as members,
           (select count(*)::int from venues) as venues,
           (select count(*)::int from discussions) as discussions,
           (select count(*)::int from resources) as resources`
  return ok(s, publicCache())
})
