import { ClubPage } from '@/components/club/ClubPage'
import { Envelope } from '@/components/club/Envelope'
import { sql } from '@/lib/db'

export const revalidate = 3600
export const metadata = { title: 'Directory - BBB', description: 'Meetups and readers of the Broke Bibliophiles book club.' }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (d: string) => {
  const t = new Date(d + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
export default async function DirectoryPage() {
  const db = sql()
  const last = await db<{ n: number; d: string; v: string | null }[]>`
    select m.meetup_number n, m.date::text d, v.name v from meetups m left join venues v on v.id = m.venue_id order by m.meetup_number desc limit 2`
  const [c] = await db<{ meetups: number; from_y: number; to_y: number; readers: number }[]>`
    select count(*)::int meetups, extract(year from min(date))::int from_y, extract(year from max(date))::int to_y,
           (select count(*) from members where not is_hidden)::int readers from meetups`
  const rec = await db<{ n: string }[]>`
    select m.display_name n from members m join meetup_attendance a on a.member_id = m.id join meetups t on t.id = a.meetup_id
    where not m.is_hidden group by m.id, m.display_name order by max(t.date) desc, m.display_name limit 2`
  const venue = (v: string | null) => v || 'venue not recorded'
  return (
    <ClubPage kind="home" tab="dir">
      <div className="sp24" />
      <h1 className="h1">Directory</h1>
      <div className="sp24" />
      <Envelope
        href="/meetups" kind="bird" title="Meetups" val={c.meetups} cachet cta="Open the meetups"
        label={`Meetups: ${c.meetups} on record. Open the meetups`}
        lines={[`${c.meetups} on record, ${c.from_y} to ${c.to_y}`, ...last.map((m) => `#${m.n} · ${fmt(m.d)} · ${venue(m.v)}`)]}
      />
      <Envelope
        href="/members" kind="soudha" title="Readers" val={c.readers} cta="Open the readers"
        label={`Readers: ${c.readers} members. Open the readers`}
        lines={[`${c.readers} members`, ...rec.map((r) => `${r.n} · recently active`)]}
      />
    </ClubPage>
  )
}
