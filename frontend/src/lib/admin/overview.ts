// Console home (A1): every number comes from a query on the live tables; nothing is typed in.
import type { Tx } from '../writes'

export interface Overview {
  on_record: number
  held: number
  this_year: number
  last_year: number
  year: number
  /** Last meetups that have readers recorded (oldest first), for the chart. */
  trend: { n: number; d: string | null; r: number }[]
  no_readers: number
  no_venue: number
  no_photo: number
  guests_twice: number
  accounts: number | null
  linked: number
  next_number: number
  venues: string[]
}

export async function overview(tx: Tx): Promise<Overview> {
  const year = new Date().getFullYear()
  const [c] = await tx<{ on_record: number; held: number; this_year: number; last_year: number; no_readers: number; no_venue: number; no_photo: number }[]>`
    select count(*)::int as on_record, coalesce(max(meetup_number), 0)::int as held,
      count(*) filter (where extract(year from date) = ${year})::int as this_year,
      count(*) filter (where extract(year from date) = ${year - 1})::int as last_year,
      count(*) filter (where not exists (select 1 from meetup_attendance a where a.meetup_id = m.id))::int as no_readers,
      count(*) filter (where venue_id is null)::int as no_venue,
      count(*) filter (where coalesce(photo_url, '') = '')::int as no_photo
    from meetups m`
  const trend = await tx<{ n: number; d: string | null; r: number }[]>`
    select * from (
      select m.meetup_number as n, m.date::text as d, (select count(*) from meetup_attendance a where a.meetup_id = m.id)::int as r
      from meetups m order by m.meetup_number desc limit 40) t
    where r > 0 order by n desc limit 12`
  const [g] = await tx<{ n: number }[]>`
    select count(*)::int as n from (
      select a.member_id from meetup_attendance a join members m on m.id = a.member_id
      where m.status <> 'member' and not m.is_hidden group by a.member_id having count(*) >= 2) x`
  const [l] = await tx<{ n: number }[]>`select count(*)::int as n from members where auth_user_id is not null`
  let accounts: number | null = null
  try {
    accounts = await tx.savepoint(async (sp) => (await sp<{ n: number }[]>`select count(*)::int as n from auth.users`)[0].n)
  } catch {
    accounts = null
  }
  const venues = await tx<{ name: string }[]>`select v.name from venues v join meetups m on m.venue_id = v.id group by v.name order by v.name`
  return { ...c, year, trend: trend.reverse(), guests_twice: g.n, accounts, linked: l.n, next_number: c.held + 1, venues: venues.map((v) => v.name) }
}
