import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClubPage } from '@/components/club/ClubPage'
import { BookPickControl } from '@/components/club/BookPickControl'
import { ReadMore } from '@/components/club/ReadMore'
import { sql } from '@/lib/db'
import { BookRow, bookSelect, booksToDicts } from '@/lib/archive'

export const revalidate = 60

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fd = (d: string) => {
  const t = new Date(d.slice(0, 10) + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}

async function load(id: string) {
  const [row] = await sql()<BookRow[]>`${bookSelect()} where b.id = ${id}`.catch(() => [] as BookRow[])
  return row ? (await booksToDicts([row]))[0] : null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const b = await load((await params).id)
  return { title: b ? `${b.title} - BBB` : 'Book not found - BBB' }
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const b = await load((await params).id)
  if (!b) notFound()
  const cover = b.cover_url && !b.cover_url.includes('nophoto') ? b.cover_url : b.thumbnail_url
  const ms = [...b.meetups].sort((x, y) => (y.number ?? 0) - (x.number ?? 0))
  const latest = ms[0]?.number
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/library-room', label: 'Library' }, { label: b.title }]} tab="lib">
      <div className="sp24" />
      <div className="bkhead">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cv" src={cover} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="nocover" aria-hidden="true" />
        )}
        <div>
          <h1 className="h2" style={{ fontSize: 28, lineHeight: '34px' }}>{b.title}</h1>
          <p className="body" style={{ color: 'var(--muted)' }}>
            {b.author_id && b.author_name ? <Link className="red" href={`/authors/${b.author_id}`}>{b.author_name}</Link> : b.author_name || 'Author not recorded'}
          </p>
          {b.series_title && <p className="cap">{b.series_title}{b.series_position != null ? ` #${b.series_position}` : ''}</p>}
        </div>
      </div>
      <p className="cap" style={{ marginTop: 14 }}>
        {b.discussion_count
          ? `Discussed ${b.discussion_count === 1 ? 'once' : `${b.discussion_count} times`}${latest ? `, latest at #${latest}` : ''}${b.first_discussed_date ? ` · first on ${fd(b.first_discussed_date)}` : ''}`
          : 'Not discussed at a meetup yet'}
      </p>
      <BookPickControl bookId={b.id} title={b.title} />
      {b.description ? <ReadMore text={b.description} /> : <p className="cap" style={{ marginTop: 14 }}>No synopsis on record.</p>}
      <p style={{ marginTop: 12 }}><Link className="link" href={`/library-room?select=${b.id}`}>Find this book on the shelf</Link></p>
      {ms.length > 0 && (
        <>
          <h2 className="sech">Discussed at <small>({ms.length})</small></h2>
          <div>
            {ms.map((m) => (
              <Link key={m.id} className="mrow" href={`/meetups/${m.number}`}>
                <span><b>#{m.number}</b><br />{m.date ? fd(m.date) : ''}{m.venue ? ` · ${m.venue}` : ''}</span>
                <i aria-hidden="true">&rsaquo;</i>
              </Link>
            ))}
          </div>
        </>
      )}
      {b.members.length > 0 && (
        <>
          <h2 className="sech">Readers <small>({b.members.length})</small></h2>
          <div className="names">
            {b.members.map((m) => (
              <Link key={m.id} href={`/members/${m.id}`}>{m.display_name}</Link>
            ))}
          </div>
        </>
      )}
      <div className="pad" />
    </ClubPage>
  )
}
