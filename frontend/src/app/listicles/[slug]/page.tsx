import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClubPage } from '@/components/club/ClubPage'
import L from '@/lib/club/listicles.json'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (d: string) => {
  const t = new Date(d + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
type Row = { x: string; a?: string; id?: string; href?: string }
type Author = { a: string; b: Row[] }
type Entry = { name: string; f: [string, string, string][] }
type Block = { t: string; x?: string; href?: string; rows?: Row[] | Author[]; entries?: Entry[] }

// a title already in our archive links to the Library; otherwise it keeps its original link (Goodreads) if it had one
const lib = (id: string) => `/library-room?select=${id}#list`
const Au = ({ r }: { r: Row }) => (r.a ? <span className="au1">{r.a}</span> : null)

function BookItem({ r }: { r: Row }) {
  if (r.id)
    return (
      <li><Link href={lib(r.id)}><span><span className="in">In the Library</span>{r.x}<Au r={r} /></span><span className="go" aria-hidden="true">&rsaquo;</span></Link></li>
    )
  if (r.href)
    return (
      <li><a href={r.href} rel="noopener"><span><span className="in">{/goodreads/.test(r.href) ? 'On Goodreads' : 'External link'}</span>{r.x}</span><span className="go" aria-hidden="true">&rsaquo;</span></a></li>
    )
  return <li><span>{r.x}<Au r={r} /></span></li>
}

function Intro({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+?)(?=[.,]?(\s|$))/g).filter((p, i) => i % 3 !== 2)
  return (
    <p className="body intro">
      {parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} className="link" style={{ display: 'inline', minHeight: 0 }} href={p} rel="noopener">{p}</a> : p))}
    </p>
  )
}

export function generateStaticParams() {
  return L.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const l = L.find((x) => x.slug === slug)
  return { title: l ? `${l.title} - BBB` : 'Listicle - BBB' }
}

export default async function ListiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const l = L.find((x) => x.slug === slug)
  if (!l) notFound()
  const blocks = l.blocks as unknown as Block[]
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/club', label: 'Club' }, { href: '/listicles', label: 'Listicles' }]} tab="club">
      <div className="listicle">
        <div className="sp24" />
        <h1 className="h1">{l.title}</h1>
        <p className="cap" style={{ margin: '6px 0 0' }}>{fmt(l.date)}</p>
        <Intro text={l.intro} />
        <div>
          {blocks.map((b, i) =>
            b.t === 'h' ? <h2 key={i} className="sec">{b.x}</h2>
            : b.t === 'sub' ? <h3 key={i} className="sub2">{b.x}</h3>
            : b.t === 'src' ? <p key={i} className="srcl"><a className="link" href={b.href} rel="noopener">{b.x} &rsaquo;</a></p>
            : b.t === 'p' ? <p key={i} className="body intro">{b.x}</p>
            : b.t === 'books' ? <ul key={i} className="bk">{(b.rows as Row[]).map((r, k) => <BookItem key={k} r={r} />)}</ul>
            : b.t === 'authors' ? (
              <div key={i} className="au">
                {(b.rows as Author[]).map((r, k) => (
                  <div key={k}>
                    <b>{r.a}</b>
                    {r.b.length > 0 && (
                      <div className="bs">{r.b.map((x, j) => (x.id ? <Link key={j} href={lib(x.id)}>{x.x}</Link> : <span key={j}>{x.x}</span>))}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : b.t === 'entries' ? (
              b.entries!.map((e, k) => (
                <section key={k} className="en">
                  <h3>{e.name}</h3>
                  <dl>
                    {e.f.map((f, j) => (
                      <div key={j}>
                        <dt>{f[0]}</dt>
                        <dd className={f[0] === 'Status' && f[1] === 'Active' ? 'ok' : undefined}>
                          {f[2] ? <a href={f[2]} rel="noopener">{/maps|g\.page/.test(f[2]) ? 'Open the map' : f[1]} &rsaquo;</a> : f[1]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))
            ) : null,
          )}
        </div>
        <div className="foot">
          <p className="body" style={{ margin: '12px 0 0' }}>Have a book to add? <a className="link" href="mailto:brokebibliophilesbangalore@gmail.com">Email us</a></p>
          <div className="sp16" />
          <Link className="link" href="/listicles">&lsaquo; All listicles</Link>
        </div>
        <div className="sp32" />
      </div>
    </ClubPage>
  )
}
