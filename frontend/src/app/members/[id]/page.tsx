import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClubPage } from '@/components/club/ClubPage'
import { BookRows, type RowBook } from '@/components/club/BookRows'
import { AdminOpen, YouNote } from '@/components/club/ProfileExtras'
import { getMemberDetail } from '@/lib/club/memberDetail'
import { sql } from '@/lib/db'

export const revalidate = 60

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fd = (d: string) => {
  const t = new Date(d.slice(0, 10) + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMemberDetail((await params).id)
  return { title: m ? `${m.display_name} - BBB` : 'Reader not found - BBB' }
}

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMemberDetail((await params).id)
  if (!m) notFound()
  const rows: RowBook[] = m.books.map((b) => ({
    id: b.id, title: b.title, author: b.author_name, cover: b.thumbnail_url || b.cover_url,
    meetups: [...b.meetups].map((x) => x.meetup_number).filter((n): n is number => n != null).sort((a, b) => b - a),
  }))
  // The wishlist is shown only when this member switched it to public (private by default).
  const wish = await sql()<{ title: string; author: string | null }[]>`
    select w.title, w.author from wishlist_items w join members x on x.id = w.member_id
    where w.member_id = ${m.id} and x.wishlist_public order by w.created_at desc, w.id`.catch(() => [])
  const ms = [...m.meetups].sort((a, b) => b.number - a.number)
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/directory', label: 'Directory' }, { href: '/members', label: 'Readers' }, { label: m.display_name }]} tab="dir">
      <div className="sp24" />
      <h1 className="h1">{m.display_name}</h1>
      <p className="facts">{m.book_count} {m.book_count === 1 ? 'book' : 'books'} &middot; {m.meetup_count} {m.meetup_count === 1 ? 'meetup' : 'meetups'}</p>
      {(m.first_active_date || m.last_active_date) && (
        <p className="facts" style={{ marginTop: 2 }}>
          {m.first_active_date ? `First recorded ${fd(m.first_active_date)}` : ''}
          {m.first_active_date && m.last_active_date ? ' · ' : ''}
          {m.last_active_date ? `Latest ${fd(m.last_active_date)}` : ''}
        </p>
      )}
      {m.bio && <p className="body" style={{ marginTop: 14 }}>{m.bio}</p>}
      <YouNote memberId={m.id} />
      <AdminOpen href="/admin" />
      {rows.length > 0 && (
        <>
          <h2 className="sech">Books they brought <small>({rows.length})</small></h2>
          <BookRows books={rows} step={20} />
        </>
      )}
      {wish.length > 0 && (
        <>
          <h2 className="sech">Wishlist <small>({wish.length})</small></h2>
          <ul className="gen">
            {wish.map((w, i) => (
              <li key={i}>{w.title}{w.author ? <span style={{ color: 'var(--muted)' }}> &middot; {w.author}</span> : null}</li>
            ))}
          </ul>
        </>
      )}
      {ms.length > 0 && (
        <>
          <h2 className="sech">Meetups attended <small>({ms.length})</small></h2>
          <div>
            {ms.map((x) => (
              <Link key={x.id} className="mrow" href={`/meetups/${x.number}`}>
                <span><b>#{x.number}</b><br />{x.date ? fd(x.date) : ''}{x.venue ? ` · ${x.venue}` : ''}</span>
                <i aria-hidden="true">&rsaquo;</i>
              </Link>
            ))}
          </div>
        </>
      )}
    </ClubPage>
  )
}
