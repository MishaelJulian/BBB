import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { ok, route } from '@/lib/http'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** Admin only: every pick with the reader's name, and the latest 300 pick-log rows. The Closet Picks view in the admin area reads this. */
export const GET = route(async (req: NextRequest) => {
  const g = await requireAdmin(req)
  if ('response' in g) return g.response
  const db = sql()
  const picks = await db`
    select p.member_id, m.display_name as reader, p.book_id, b.title, a.full_name as author_name, p.tag, p.created_at::text as created_at
    from member_picks p join members m on m.id = p.member_id join canonical_books b on b.id = p.book_id left join authors a on a.id = b.author_id
    order by p.created_at desc`
  const log = await db`
    select id::text, at::text as at, member_id, member_name as reader, action, book_id, book_title as title, tag
    from pick_log order by at desc, id desc limit 300`
  return ok({ max: 4, picks, log }, NO_STORE)
})
