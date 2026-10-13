import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, flag, ok, publicCache, route } from '@/lib/http'
import { BookRow, bookSelect, booksToDicts } from '@/lib/archive'

export const dynamic = 'force-dynamic'

export const GET = route(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams
  const search = q.get('search'), author = q.get('author'), year = q.get('year')
  const sortBy = q.get('sort_by') ?? 'title', desc = (q.get('sort_order') ?? 'asc') === 'desc'
  const limit = Number(q.get('limit') ?? 3000), offset = Number(q.get('offset') ?? 0)
  if (!Number.isInteger(limit) || limit < 1 || limit > 3000 || !Number.isInteger(offset) || offset < 0) {
    return apiError(422, 'limit must be 1 to 3000 and offset 0 or more.')
  }
  const db = sql()
  // Same rule as the Python API: "only discussed" and "exclude general" both mean a proper (non-general, non-tangent) book discussion.
  const properOnly = flag(q.get('only_discussed')) || flag(q.get('exclude_general'))
  let where = db`true`
  if (properOnly) {
    where = db`${where} and b.media_type = 'book' and b.id in (
      select d.canonical_book_id from discussions d
      where d.canonical_book_id is not null and d.media_type = 'book'
        and (d.topic is null or (d.topic not ilike '%general%' and d.topic not ilike '%tangent%'))
        and (d.notes is null or (d.notes not ilike '%general%' and d.notes not ilike '%tangent%')))`
  }
  if (author) where = db`${where} and a.full_name ilike ${'%' + author + '%'}`
  if (search) where = db`${where} and (b.title ilike ${'%' + search + '%'} or a.full_name ilike ${'%' + search + '%'})`
  const dir = desc ? db`desc` : db`asc`
  const order =
    sortBy === 'discussionCount' ? db`(select count(*) from discussions d2 where d2.canonical_book_id = b.id) ${dir}, b.ctid`
    : sortBy === 'firstDiscussedYear' ? db`b.created_at ${dir}, b.ctid`
    : db`b.title collate "C" ${dir}, b.ctid`
  const rows = await db<BookRow[]>`${bookSelect()} where ${where} order by ${order} limit ${limit} offset ${offset}`
  const books = await booksToDicts(rows)
  // fields=shelf: the closet shelf never reads these, and the detail popups fetch what they need on open ("thin shelf, rich pull").
  const out = q.get('fields') === 'shelf'
    ? books.map((b) => { const { description, members, goodreads_id, normalized_title, rating, page_count, ...thin } = b; void [description, members, goodreads_id, normalized_title, rating, page_count]; return thin })
    : books
  return ok(out, !search && !author && !year ? publicCache() : undefined)
})
