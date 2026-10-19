'use client'

import * as React from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth'
import { FloatPair } from './FloatPair'
import { useMe } from './useMe'

interface PickRow { member_id: string; reader: string; book_id: string; title: string; author_name: string | null; tag: string; created_at: string }
interface LogRow { id: string; at: string; reader: string; action: string; title: string; tag: string | null }
type Tab = 'book' | 'reader' | 'hist'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dt = (d: string) => {
  const t = new Date(d.slice(0, 10) + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
const TAGS = ['Favourite', 'Want to read']

function group<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, T[]>()
  rows.forEach((r) => {
    const k = key(r)
    m.set(k, [...(m.get(k) ?? []), r])
  })
  return [...m.entries()]
}

/** Admin view of the shared Closet Picks: Most picked, By reader, History. Reads the real tables; only admins get an answer. */
export function AdminPicks() {
  const me = useMe()
  const [data, setData] = React.useState<{ picks: PickRow[]; log: LogRow[] } | null | undefined>(undefined)
  const [tab, setTab] = React.useState<Tab>('book')
  const [tag, setTag] = React.useState('')
  const [q, setQ] = React.useState('')
  const [book, setBook] = React.useState<string | null>(null)
  const [reader, setReader] = React.useState<string | null>(null)
  const fs = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    if (me.state !== 'admin') return
    let dead = false
    void authFetch('/api/me/picks/admin').then(async (r) => !dead && setData(r.ok ? await r.json() : null)).catch(() => !dead && setData(null))
    return () => { dead = true }
  }, [me.state])

  if (me.state === 'loading') return <p className="body">One moment...</p>
  if (me.state !== 'admin')
    return (
      <>
        <h1 className="h1">Closet Picks</h1>
        <p className="body" style={{ marginTop: 12 }}>{me.state === 'out' ? 'Sign in as an admin to see this page.' : 'This page is for admins.'}</p>
        <div className="sp16" />
        <Link className="link" href={me.state === 'out' ? '/login' : '/me'}>{me.state === 'out' ? 'Sign in' : 'Back to Me'}</Link>
      </>
    )
  if (data === undefined) return <p className="body">One moment...</p>
  if (data === null) return <p className="body">Could not load the picks. Try again in a minute.</p>

  const rows = data.picks.filter((p) => !tag || p.tag === tag)
  const readers = new Set(rows.map((r) => r.member_id)).size
  const ql = q.trim().toLowerCase()
  const inList = !book && !reader

  let body: React.ReactNode
  if (book) {
    const r = rows.filter((x) => x.book_id === book)
    body = (
      <>
        <button className="back" type="button" onClick={() => setBook(null)} style={{ all: 'unset', cursor: 'pointer' }}><span aria-hidden="true">&lsaquo;</span> Most picked</button>
        <h2 className="h2" style={{ marginTop: 4 }}>{r[0]?.title ?? ''}</h2>
        <p className="cap">{r.length} {r.length === 1 ? 'pick' : 'picks'}</p>
        {r.map((x) => (
          <div className="rrow" key={x.member_id}>
            <span className="av" aria-hidden="true" style={{ color: "var(--ink)", textShadow: "none" }}>{x.reader[0]}</span>
            <span><span className="t1">{x.reader}</span><span className="t2">{dt(x.created_at)}</span></span>
            <span className="rt">{x.tag}</span>
          </div>
        ))}
        <p style={{ marginTop: 12 }}><Link className="link" href={`/books/${book}`}>Open the book page</Link></p>
      </>
    )
  } else if (reader) {
    const r = rows.filter((x) => x.member_id === reader)
    body = (
      <>
        <button className="back" type="button" onClick={() => setReader(null)} style={{ all: 'unset', cursor: 'pointer' }}><span aria-hidden="true">&lsaquo;</span> By reader</button>
        <h2 className="h2" style={{ marginTop: 4 }}>{r[0]?.reader ?? ''}</h2>
        <p className="cap">{r.length} of 4 picks</p>
        {r.map((x, i) => (
          <div className="rrow" key={x.book_id}>
            <span className="av" aria-hidden="true" style={{ color: "var(--ink)", textShadow: "none" }}>{i + 1}</span>
            <span><span className="t1">{x.title}</span><span className="t2">{x.author_name ?? 'Author not recorded'} &middot; {dt(x.created_at)}</span></span>
            <span className="rt">{x.tag}</span>
          </div>
        ))}
      </>
    )
  } else if (tab === 'book') {
    const g = group(rows, (x) => x.book_id)
      .map(([id, l]) => ({ id, l, t: l[0].title, a: l[0].author_name ?? '', f: l.filter((x) => x.tag === 'Favourite').length, w: l.filter((x) => x.tag === 'Want to read').length }))
      .filter((x) => !ql || `${x.t} ${x.a}`.toLowerCase().includes(ql))
      .sort((a, b) => b.l.length - a.l.length || a.t.localeCompare(b.t))
    body = g.length ? (
      g.map((x, i) => (
        <button key={x.id} className="rrow" type="button" onClick={() => setBook(x.id)} style={{ all: 'unset', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: '0 12px', alignItems: 'center', minHeight: 64, padding: '8px 0', borderTop: '1px solid var(--line2)', width: '100%', cursor: 'pointer' }}>
          <span style={{ font: '600 16px/22px var(--sans)', color: 'var(--muted)' }}>{i + 1}</span>
          <span><span style={{ display: 'block', font: '600 17px/24px var(--serif)' }}>{x.t}</span><span style={{ display: 'block', font: '400 14px/20px var(--sans)', color: 'var(--muted)' }}>{x.f} Favourite &middot; {x.w} Want to read</span></span>
          <span style={{ font: '600 18px/24px var(--sans)' }}>{x.l.length}</span>
        </button>
      ))
    ) : (
      <p className="body" style={{ marginTop: 16 }}>No picks yet.</p>
    )
  } else if (tab === 'reader') {
    const g = group(rows, (x) => x.member_id).filter(([, l]) => !ql || l[0].reader.toLowerCase().includes(ql) || l.some((x) => x.title.toLowerCase().includes(ql)))
    body = g.length ? (
      g
        .sort((a, b) => a[1][0].reader.localeCompare(b[1][0].reader))
        .map(([id, l]) => (
          <button key={id} type="button" onClick={() => setReader(id)} style={{ all: 'unset', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: '0 12px', alignItems: 'center', minHeight: 64, padding: '8px 0', borderTop: '1px solid var(--line2)', width: '100%', cursor: 'pointer' }}>
            <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 16px/1 var(--serif)' }}>{l[0].reader[0]}</span>
            <span><span style={{ display: 'block', font: '600 17px/24px var(--sans)' }}>{l[0].reader}</span><span style={{ display: 'block', font: '400 14px/20px var(--sans)', color: 'var(--muted)' }}>{l.map((x) => x.title).join(', ')}</span></span>
            <span style={{ font: '600 15px/22px var(--sans)' }}>{l.length} of 4</span>
          </button>
        ))
    ) : (
      <p className="body" style={{ marginTop: 16 }}>No readers have picked yet.</p>
    )
  } else {
    body = data.log.length ? (
      data.log.map((x) => (
        <div className="rrow" key={x.id} style={{ gridTemplateColumns: '1fr' }}>
          <span><span className="t1">{x.reader} {x.action} {x.title}{x.tag ? ` (${x.tag})` : ''}</span><span className="t2">{dt(x.at)}</span></span>
        </div>
      ))
    ) : (
      <p className="body" style={{ marginTop: 16 }}>No pick history yet.</p>
    )
  }

  return (
    <>
      <Link className="back" href="/admin"><span aria-hidden="true">&lsaquo;</span>Admin</Link>
      <h1 className="h1">Closet Picks</h1>
      <p className="cap" style={{ marginTop: 6 }}>{rows.length} {rows.length === 1 ? 'pick' : 'picks'} from {readers} {readers === 1 ? 'reader' : 'readers'}.</p>
      {inList && (
        <div className="tabs" role="group" aria-label="View">
          {([['book', 'Most picked'], ['reader', 'By reader'], ['hist', 'History']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      )}
      {inList && tab !== 'hist' && (
        <div>
          <label className="cap" htmlFor="qi">Search a book or a reader</label>
          <input className="fld" id="qi" type="search" style={{ padding: 0 }} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </div>
      )}
      <div>{body}</div>
      <div className="pad" />
      <FloatPair hidden={tab === 'hist' && inList}><button className="ghost" type="button" onClick={() => fs.current?.showModal()}>Filters</button></FloatPair>
      <dialog className="sheetx" ref={fs} aria-labelledby="fst">
        <p className="h2" id="fst">Filters</p>
        <fieldset className="tagset">
          <legend className="cap">Pick type</legend>
          {['', ...TAGS].map((t) => (
            <label className="opt" key={t}><input type="radio" name="tag" value={t} checked={tag === t} onChange={() => setTag(t)} /> {t || 'All'}</label>
          ))}
        </fieldset>
        <div className="foot"><button className="btn" type="button" onClick={() => fs.current?.close()}><span>Done</span><span aria-hidden="true">&rsaquo;</span></button></div>
      </dialog>
    </>
  )
}
