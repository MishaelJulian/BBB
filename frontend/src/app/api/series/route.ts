import { sql } from '@/lib/db'
import { ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const rows = await sql()`
    select s.id, s.title, a.full_name as author,
           (select count(*)::int from canonical_books b where b.series_id = s.id) as volume_count,
           (select count(*)::int from discussions d where d.series_id = s.id) as mention_count
    from series s left join authors a on a.id = s.author_id
    order by s.title collate "C"`
  return ok(rows, publicCache())
})
