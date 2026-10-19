'use client'

import * as React from 'react'
import Link from 'next/link'
import type { MeetupIndexRow } from '@/lib/club/indexes'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NOV = 'Not recorded'
const fmt = (d: string) => {
  const t = new Date(d + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
const ven = (x: MeetupIndexRow) => x.v || NOV
const rdr = (x: MeetupIndexRow) => (x.r ? `${x.r} ${x.r === 1 ? 'reader' : 'readers'}` : 'Readers not recorded')
const low = (s: string) => s.toLowerCase()
const isNum = (q: string) => /^#?\d+$/.test(q)

type St = { q: string; venue: string; year: string; month: string; fmt: string; att: string; sort: string; view: string; shown: number }
const INIT: St = { q: '', venue: 'all', year: 'all', month: 'all', fmt: 'all', att: '', sort: 'new', view: 'grid', shown: 20 }

export function MeetupsList({ data, latest }: { data: MeetupIndexRow[]; latest: number }) {
  const [S, setS] = React.useState<St>(INIT)
  const [open, setOpen] = React.useState(false)
  const sheet = React.useRef<HTMLDialogElement>(null)
  const more = React.useRef<HTMLDivElement>(null)
  const set = (p: Partial<St>) => setS((s) => ({ ...s, ...p }))

  // start from the address (shared links keep their filters) and the remembered view
  React.useEffect(() => {
    const P = new URLSearchParams(window.location.search)
    let view = P.get('view')
    try {
      view = view || localStorage.getItem('bbb_view')
    } catch {}
    setS({ q: P.get('q') || '', venue: P.get('venue') || 'all', year: P.get('year') || 'all', month: P.get('month') || 'all', fmt: P.get('fmt') || 'all', att: P.get('att') || '', sort: P.get('sort') || 'new', view: view || 'grid', shown: 20 })
  }, [])
  React.useEffect(() => {
    const p = new URLSearchParams()
    for (const k of ['q', 'venue', 'year', 'month', 'fmt', 'att', 'sort', 'view'] as const) {
      const v = S[k]
      if (v && v !== 'all' && !(k === 'sort' && v === 'new') && !(k === 'view' && v === 'grid')) p.set(k, v)
    }
    history.replaceState(null, '', p.toString() ? `?${p}` : window.location.pathname)
    try {
      localStorage.setItem('bbb_view', S.view)
    } catch {}
  }, [S])

  const why = (x: MeetupIndexRow): string[] => {
    if (!S.q || isNum(S.q)) return []
    const q = low(S.q)
    const o: string[] = []
    const b = x.bk.find((k) => low(k[0]).includes(q) || low(k[1]).includes(q))
    if (b) o.push(low(b[0]).includes(q) ? `Book: ${b[0]}` : `Author: ${b[1]} (${b[0]})`)
    const r = x.rd.filter((n) => low(n).includes(q))
    if (r.length) o.push(`Reader: ${r.join(', ')}`)
    return o
  }
  const hit = (x: MeetupIndexRow) => !S.q || (isNum(S.q) ? String(x.n).startsWith(S.q.replace('#', '')) : why(x).length > 0)
  const f = data.filter(
    (x) => (S.att !== 'none' || x.r === 0) && (S.venue === 'all' || ven(x) === S.venue) && (S.year === 'all' || x.d.slice(0, 4) === S.year) && (S.month === 'all' || +x.d.slice(5, 7) === +S.month) && (S.fmt === 'all' || x.f === S.fmt) && hit(x),
  )
  const s = [...f].sort(S.sort === 'old' ? (a, b) => a.n - b.n : S.sort === 'readers' ? (a, b) => b.r - a.r || b.n - a.n : (a, b) => b.n - a.n)
  const vs = [...new Set(data.map(ven))].sort((a, b) => data.filter((x) => ven(x) === b).length - data.filter((x) => ven(x) === a).length)
  const yrs = [...new Set(data.map((x) => x.d.slice(0, 4)))].sort().reverse()
  const act: [string, string][] = []
  if (S.year !== 'all') act.push(['year', S.year])
  if (S.month !== 'all') act.push(['month', MON[+S.month - 1]])
  if (S.venue !== 'all') act.push(['venue', S.venue])
  if (S.att === 'none') act.push(['att', 'No readers recorded'])
  if (S.fmt !== 'all') act.push(['fmt', S.fmt === 'O' ? 'Online' : 'In person'])
  const reset = () => set({ q: '', venue: 'all', year: 'all', month: 'all', fmt: 'all', att: '', shown: 20 })
  const v = s.slice(0, S.shown)

  React.useEffect(() => {
    const el = more.current
    if (!el) return
    const io = new IntersectionObserver((en) => en[0].isIntersecting && setS((p) => ({ ...p, shown: p.shown + 20 })), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [s.length, S.shown])
  React.useEffect(() => {
    const d = sheet.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // people and author suggestions
  const q = low(S.q)
  const rd = new Set<string>()
  const au = new Set<string>()
  if (S.q.length >= 3 && !isNum(S.q)) data.forEach((d) => {
    d.rd.forEach((n) => low(n).includes(q) && rd.add(n))
    d.bk.forEach((k) => low(k[1]).includes(q) && au.add(k[1]))
  })
  const grp = (label: string, a: Set<string>) =>
    a.size ? (
      <>
        <p className="cap" style={{ margin: '8px 0 0' }}>{label}</p>
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          {[...a].sort().slice(0, 6).map((n) => (
            <button key={n} type="button" onClick={() => set({ q: n, shown: 20 })}>{n}</button>
          ))}
        </div>
      </>
    ) : null
  const showPeople = rd.size + au.size > 1 && !(rd.size === 1 && au.size === 0) && !(au.size === 1 && rd.size === 0)
  const radio = (name: keyof St, value: string, text: string) => (
    <label className="opt" key={name + value}>
      <input type="radio" name={name} value={value} checked={String(S[name]) === value} onChange={() => set({ [name]: value, shown: 20 } as Partial<St>)} />
      {text}
    </label>
  )

  return (
    <>
      <div className="sp24" />
      <h1 className="h1">Meetups</h1>
      <p className="cap">{data.length} on record of {latest} held</p>
      <div className="fwrap">
        <input className="fld" id="q" type="search" placeholder="Number, book, author or reader" aria-label="Search by meetup number, book, author or reader" autoComplete="off" value={S.q} onChange={(e) => set({ q: e.target.value, shown: 20 })} />
        {S.q && <button className="fclear" aria-label="Clear search" onClick={() => set({ q: '' })}>&times;</button>}
      </div>
      <div className="seg" role="group" aria-label="Venue">
        {['all', ...vs].map((x) => (
          <button key={x} type="button" aria-pressed={S.venue === x} onClick={() => set({ venue: x, shown: 20 })}>{x === 'all' ? 'All' : x}</button>
        ))}
      </div>
      <button className="fbtn ffloat" type="button" onClick={() => setOpen(true)}>Filters{act.length ? ` (${act.length})` : ''}</button>
      <div className="bar2" style={{ justifyContent: 'flex-end' }}>
        <div className="tg" role="group" aria-label="View">
          <button type="button" aria-pressed={S.view === 'list'} onClick={() => set({ view: 'list' })}>List</button>
          <button type="button" aria-pressed={S.view === 'grid'} onClick={() => set({ view: 'grid' })}>Grid</button>
        </div>
      </div>
      <div className="chips">
        {act.map((a) => (
          <button key={a[0]} type="button" aria-label={`Remove filter ${a[1]}`} onClick={() => set({ [a[0]]: a[0] === 'att' ? '' : 'all' } as Partial<St>)}>{a[1]}</button>
        ))}
        {(act.length > 0 || S.q) && (
          <button type="button" style={{ color: 'var(--ink)', textDecoration: 'underline' }} onClick={reset}>Reset all</button>
        )}
      </div>
      <div>{showPeople && <>{grp('Readers', rd)}{grp('Authors', au)}</>}</div>
      <p className="cap count" aria-live="polite">Showing {s.length} meetup{s.length === 1 ? '' : 's'}</p>
      <div>
        {!s.length ? (
          <p className="body" style={{ padding: '16px 0' }}>No meetups match. <button className="fbtn" type="button" onClick={reset}>Reset all</button></p>
        ) : S.view === 'grid' ? (
          <div className="grid2">
            {v.map((x) => (
              <Link key={x.n} className="tile" href={`/meetups/${x.n}`}>
                <span className="num">#{x.n}</span>
                <span className="t2">{fmt(x.d)}</span>
                <span className="t2">{ven(x)}</span>
                <span className="t2">{rdr(x)}</span>
                {why(x).map((w) => <span key={w} className="t2 why">{w}</span>)}
                <span className="go" aria-hidden="true">&rsaquo;</span>
              </Link>
            ))}
          </div>
        ) : (
          <div>
            {v.map((x) => (
              <Link key={x.n} className="rowl" href={`/meetups/${x.n}`}>
                <span>
                  <span className="t1">Meetup #{x.n}</span>
                  <span className="t2">{fmt(x.d)} &middot; {ven(x)}</span>
                  <span className="t2">{rdr(x)}</span>
                  {why(x).map((w) => <span key={w} className="t2 why">{w}</span>)}
                </span>
                <span className="go" aria-hidden="true">&rsaquo;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="more" ref={more} hidden={s.length <= S.shown} />
      <dialog id="fsheet" ref={sheet} aria-label="Filters" onClose={() => setOpen(false)} onClick={(e) => e.target === sheet.current && sheet.current?.close()}>
        <p className="h2">Filters</p>
        <div className="grp"><p className="gt">Venue</p><div>{radio('venue', 'all', 'All venues')}{vs.map((x) => radio('venue', x, x))}</div></div>
        <div className="grp"><p className="gt">Format</p><div>{radio('fmt', 'all', 'Any format')}{radio('fmt', 'I', 'In person')}{radio('fmt', 'O', 'Online')}</div></div>
        <div className="grp"><p className="gt">Year</p><div className="g4">{radio('year', 'all', 'All')}{yrs.map((y) => radio('year', y, y))}</div></div>
        <div className="grp"><p className="gt">Month</p><div className="g4">{radio('month', 'all', 'All')}{MON.map((m, i) => radio('month', String(i + 1), m))}</div></div>
        <div className="grp"><p className="gt">Sort</p><div>{radio('sort', 'new', 'Newest first')}{radio('sort', 'old', 'Oldest first')}{radio('sort', 'readers', 'Most readers')}</div></div>
        <div className="acts">
          <button className="fbtn" type="button" onClick={reset}>Reset all</button>
          <button className="btn" type="button" style={{ width: 'auto' }} onClick={() => sheet.current?.close()}><span>Show {s.length} meetup{s.length === 1 ? '' : 's'}</span></button>
        </div>
      </dialog>
    </>
  )
}
