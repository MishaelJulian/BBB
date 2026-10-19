import Image from 'next/image'
import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'
import { ElasticHeadline } from '@/components/club/ElasticHeadline'
import { PhotoRows } from '@/components/club/PhotoRows'
import { Triptych } from '@/components/club/Triptych'
import { sql } from '@/lib/db'

export const revalidate = 3600

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fd = (d: string) => {
  const t = new Date(d.slice(0, 10) + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}

export const metadata = { title: 'BBB - a book club in Bangalore', description: 'A book club in Bangalore, since 2017. Fourth Sunday, Bookworm.' }

export default async function HomePage() {
  const db = sql()
  const [c] = await db<{ books: number; meetups: number; latest: number; readers: number }[]>`
    select (select count(*) from canonical_books)::int books, (select count(*) from meetups)::int meetups,
           (select coalesce(max(meetup_number), 0) from meetups)::int latest, (select count(*) from members where not is_hidden)::int readers`
  const [m] = await db<{ meetup_number: number; date: string; venue: string | null; photo_url: string | null; description: string | null }[]>`
    select m.meetup_number, m.date::text, v.name venue, m.photo_url, m.description
    from meetups m left join venues v on v.id = m.venue_id where m.meetup_number < 100 order by m.meetup_number desc limit 1`
  const today = fd(new Date().toISOString())
  return (
    <ClubPage kind="home" tab="home" home bare>
      <section className="hero" aria-labelledby="hero-h">
        <div className="wrap">
          <ElasticHeadline lines={['A book club', 'that will make', 'you go broke.']} />
          <p className="body facts">Fourth Sunday, 2:30&ndash;4:30 pm, Bookworm, Church Street.</p>
          <a className="btn" href="https://brokebibliophilesbangalore.substack.com" target="_blank" rel="noopener">
            <span>Subscribe for the next one</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
          <p className="cap" style={{ marginTop: 8 }}>Invites and RSVPs come by Substack.</p>
        </div>
      </section>
      <section className="wrap" aria-labelledby="h100">
        <p className="eyebrow">Meetup #100 &middot; 11 Oct 2026</p>
        <h2 className="h2" id="h100">The 100th, in three moments</h2>
        <div className="sp16" />
        <div className="rows">
          <PhotoRows ids={['wa0037', 'wa0044', 'wa0019']} caps={{ wa0037: 'Arrival and introduction', wa0044: 'Discussion', wa0019: 'Games' }} />
        </div>
        <Link className="link" href="/meetups/100">See the whole day &rarr;</Link>
      </section>
      <div className="sp48" />
      {m && (
        <section className="wrap" aria-labelledby="h99">
          <p className="eyebrow">The meetup before</p>
          <h2 className="h2" id="h99">Meetup #{m.meetup_number}</h2>
          <p className="cap">{fd(m.date)}{m.venue ? ` · ${m.venue}` : ''}</p>
          <div className="sp16" />
          {m.photo_url && (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/2', background: 'var(--paper2)' }}>
              <Image src={m.photo_url} alt={`Attendees of meetup ${m.meetup_number}`} fill sizes="(max-width: 430px) 100vw, 430px" style={{ objectFit: 'cover' }} />
            </div>
          )}
          <div className="sp16" />
          {m.description && <p className="body clamp3">{m.description}</p>}
          <Link className="link" href={`/meetups/${m.meetup_number}`}>Read the post &rarr;</Link>
        </section>
      )}
      <div className="sp48" />
      <section aria-labelledby="hx">
        <h2 className="vh" id="hx">Explore the archive</h2>
        <div className="tri">
          <Triptych books={c.books} meetups={c.meetups} latest={c.latest} readers={c.readers} />
        </div>
        <p className="cap wrap" style={{ marginTop: 8 }}>Counts are live from the archive, {today}.</p>
      </section>
    </ClubPage>
  )
}
