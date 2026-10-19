import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClubPage } from '@/components/club/ClubPage'
import { BookRows, type RowBook } from '@/components/club/BookRows'
import { AdminOpen } from '@/components/club/ProfileExtras'
import { Meetup100 } from '@/components/club/Meetup100'
import { sql } from '@/lib/db'
import { MeetupRow, meetupSelect, meetupsToDicts } from '@/lib/archive'
import { getReaderIndex } from '@/lib/club/indexes'

export const revalidate = 60

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fd = (d: string) => {
  const t = new Date(d.slice(0, 10) + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
const FORMAT: Record<string, string> = { IN_PERSON: 'In person', ONLINE: 'Online', HYBRID: 'Hybrid' }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Meetup #${id.replace('#', '')} - BBB` }
}

export default async function MeetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const n = Number(id.replaceAll('#', '').trim())
  if (!Number.isInteger(n) || n < 1) notFound()
  if (n === 100) return <Meetup100 />
  const db = sql()
  const [row] = await db<MeetupRow[]>`${meetupSelect()} where m.meetup_number = ${n}`
  if (!row) notFound()
  const [m] = await meetupsToDicts([row])
  const nums = (await db<{ n: number }[]>`select meetup_number n from meetups order by 1`).map((r) => r.n).concat([100]).sort((a, b) => a - b)
  const i = nums.indexOf(n)
  const prev = i > 0 ? nums[i - 1] : null
  const next = i >= 0 && i < nums.length - 1 ? nums[i + 1] : null
  const byName = new Map((await getReaderIndex()).map((r) => [r.n, r.id]))

  const all = m.books
  const regular = all.filter((b) => !b.is_discussion_mention && !b.is_general_discussion)
  const gen = [
    ...all.filter((b) => b.is_discussion_mention || b.is_general_discussion).map((b) => ({ title: b.title, author: b.author })),
    ...m.series.map((s) => ({ title: s.title, author: s.author })),
  ]
  const readers = m.members
  const rows: RowBook[] = regular.map((b) => ({ id: b.id, title: b.title, author: b.author, cover: b.thumbnail_url || b.cover_url, by: b.member ? { name: b.member, id: byName.get(b.member) } : null }))
  const href = (x: number) => `/meetups/${x}`
  const jumps = [['books', 'Books', regular.length], ['readers', 'Readers', readers.length], ['general', 'General discussion', gen.length]].filter((x) => x[2]) as [string, string, number][]

  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/directory', label: 'Directory' }, { href: '/meetups', label: 'Meetups' }, { label: `#${n}` }]} tab="dir">
      <div className="sp24" />
      <h1 className="h1">Meetup #{n}</h1>
      <p className="facts">{[m.date ? fd(m.date) : 'Date not recorded', m.venue || 'Venue not recorded', FORMAT[m.format] ?? ''].filter(Boolean).join(' · ')}</p>
      <p className="facts" style={{ marginTop: 2 }}>{regular.length} books{readers.length ? ` · ${readers.length} readers` : ''}</p>
      {jumps.length > 0 && (
        <nav className="jump" aria-label="On this page">
          {jumps.map(([k, l]) => <a key={k} href={`#${k}`}>{l}</a>)}
        </nav>
      )}
      {m.photo_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ph" src={m.photo_url} alt={`Group photo from BBB meetup #${n}`} />
          <p className="pcap">The group at meetup #{n}, {m.venue || 'Bookworm'}.</p>
        </>
      )}
      {m.pdf_url && (
        <>
          <div className="sp16" />
          <a className="btn" href={m.pdf_url} target="_blank" rel="noopener"><span>Download the books PDF</span><span aria-hidden="true">&darr;</span></a>
        </>
      )}
      <AdminOpen href="/admin" />
      {regular.length > 0 && (
        <>
          <h2 className="sech" id="books">Books discussed <small>({regular.length})</small></h2>
          <BookRows books={rows} />
        </>
      )}
      <h2 className="sech" id="readers">Who was there{readers.length ? <> <small>({readers.length})</small></> : null}</h2>
      {readers.length ? (
        <div className="names">
          {readers.map((r) => <Link key={r.id} href={`/members/${r.id}`}>{r.display_name}</Link>)}
        </div>
      ) : (
        <p className="body" style={{ marginTop: 8, color: 'var(--muted)' }}>Readers not recorded for this meetup.</p>
      )}
      {gen.length > 0 && (
        <>
          <h2 className="sech" id="general">General discussion <small>({gen.length})</small></h2>
          <ul className="gen">
            {gen.map((g, k) => (
              <li key={k}>{g.title}{g.author ? <span style={{ color: 'var(--muted)' }}> &middot; {g.author}</span> : null}</li>
            ))}
          </ul>
        </>
      )}
      <nav className="pn" aria-label="Other meetups">
        {prev != null ? <Link href={href(prev)}>&lsaquo; Meetup #{prev}</Link> : <span />}
        {next != null ? <Link href={href(next)}>Meetup #{next} &rsaquo;</Link> : <span />}
      </nav>
    </ClubPage>
  )
}
