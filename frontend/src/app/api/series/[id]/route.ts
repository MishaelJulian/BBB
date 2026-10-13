import { sql } from '@/lib/db'
import { apiError, ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params
  const db = sql()
  const [ser] = await db<{ id: string; title: string; author: string | null }[]>`
    select s.id, s.title, a.full_name as author from series s left join authors a on a.id = s.author_id where s.id = ${id}`
  if (!ser) return apiError(404, 'Series not found')
  const volumes = await db<{ id: string; title: string; position: number | null; cover_url: string | null; thumbnail_url: string | null }[]>`
    select id, title, series_position as position, cover_url, coalesce(thumbnail_url, cover_url) as thumbnail_url
    from canonical_books where series_id = ${id}
    order by series_position nulls last, title collate "C"`
  // Hidden members are never named publicly.
  const meetups = await db<{ number: number; date: string | null; member: string | null }[]>`
    select mt.meetup_number as number, mt.date::text as date, case when m.is_hidden then null else m.display_name end as member
    from discussions d join meetups mt on mt.id = d.meetup_id left join members m on m.id = d.member_id
    where d.series_id = ${id} order by mt.meetup_number, d.ctid`
  return ok({ ...ser, volumes, meetups }, publicCache())
})
