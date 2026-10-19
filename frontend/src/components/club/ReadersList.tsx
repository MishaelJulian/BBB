'use client'

import * as React from 'react'
import Link from 'next/link'
import type { ReaderIndexRow } from '@/lib/club/indexes'

// curated palette: hand-picked, no orange accent and no red or green status colours; the colour is stable per member
const PAL = ['#12295a', '#4a5a78', '#3f6b72', '#6a4a6e', '#6b6b6b', '#2b2b2b']
const ini = (n: string) => {
  const w = n.trim().split(/\s+/)
  return ((w[0][0] || '') + ((w.length > 1 ? w[w.length - 1][0] : w[0][1]) || '')).toUpperCase()
}
const col = (id: string) => PAL[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % PAL.length]
const Av = ({ x, big }: { x: ReaderIndexRow; big?: boolean }) => (
  <span className={`av${big ? ' big' : ''}`} style={{ background: col(x.id) }} aria-hidden="true">{ini(x.n)}</span>
)

const SEGS: [string, string, (x: ReaderIndexRow) => boolean][] = [
  ['all', 'All', () => true],
  ['reg', 'Regulars', (x) => x.m >= 10],
  ['act', 'Active in 2026', (x) => (x.l || '').startsWith('2026')],
  ['new', 'New in 2026', (x) => (x.f || '').startsWith('2026')],
]
const SORTS: [string, string][] = [['books', 'Most books read'], ['meetups', 'Most meetups'], ['name', 'Name A to Z'], ['recent', 'Recently active']]
type St = { q: string; seg: string; sort: string; view: string; shown: number }

export function ReadersList({ data }: { data: ReaderIndexRow[] }) {
  const [S, setS] = React.useState<St>({ q: '', seg: 'all', sort: 'books', view: 'grid', shown: 20 })
  const [open, setOpen] = React.useState(false)
  const sheet = React.useRef<HTMLDialogElement>(null)
  const more = React.useRef<HTMLDivElement>(null)
  const set = (p: Partial<St>) => setS((s) => ({ ...s, ...p }))
  React.useEffect(() => {
    const P = new URLSearchParams(window.location.search)
    let view = P.get('view')
    try {
      view = view || localStorage.getItem('bbb_view')
    } catch {}
    setS({ q: P.get('q') || '', seg: P.get('seg') || 'all', sort: P.get('sort') || 'books', view: view || 'grid', shown: 20 })
  }, [])
  React.useEffect(() => {
    const p = new URLSearchParams()
    for (const k of ['q', 'seg', 'sort', 'view'] as const) {
      const v = S[k]
      if (v && !(k === 'seg' && v === 'all') && !(k === 'sort' && v === 'books') && !(k === 'view' && v === 'grid')) p.set(k, v)
    }
    history.replaceState(null, '', p.toString() ? `?${p}` : window.location.pathname)
    try {
      localStorage.setItem('bbb_view', S.view)
    } catch {}
  }, [S])
  const q = S.q.toLowerCase()
  const inSeg = SEGS.find((g) => g[0] === S.seg) ?? SEGS[0]
  const s = data.filter((x) => inSeg[2](x) && (!q || x.n.toLowerCase().includes(q))).sort(
    S.sort === 'meetups' ? (a, b) => b.m - a.m || b.b - a.b : S.sort === 'name' ? (a, b) => a.n.localeCompare(b.n) : S.sort === 'recent' ? (a, b) => (b.l || '').localeCompare(a.l || '') : (a, b) => b.b - a.b || b.m - a.m,
  )
  const v = s.slice(0, S.shown)
  const reset = () => set({ q: '', seg: 'all', shown: 20 })
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
  return (
    <>
      <div className="sp24" />
      <h1 className="h1">Readers</h1>
      <p className="cap">{data.length} members</p>
      <div className="fwrap">
        <input className="fld" type="search" placeholder="By name" aria-label="By name" autoComplete="off" value={S.q} onChange={(e) => set({ q: e.target.value, shown: 20 })} />
        {S.q && <button className="fclear" aria-label="Clear search" onClick={() => set({ q: '' })}>&times;</button>}
      </div>
      <div className="seg" role="group" aria-label="Group">
        {SEGS.map((g) => (
          <button key={g[0]} type="button" aria-pressed={S.seg === g[0]} onClick={() => set({ seg: g[0], shown: 20 })}>{g[1]}</button>
        ))}
      </div>
      <button className="fbtn ffloat" type="button" onClick={() => setOpen(true)}>Sort</button>
      <div className="bar2" style={{ justifyContent: 'flex-end' }}>
        <div className="tg" role="group" aria-label="View">
          <button type="button" aria-pressed={S.view === 'list'} onClick={() => set({ view: 'list' })}>List</button>
          <button type="button" aria-pressed={S.view === 'grid'} onClick={() => set({ view: 'grid' })}>Grid</button>
        </div>
      </div>
      <div className="chips">
        {S.seg !== 'all' && <button type="button" onClick={() => set({ seg: 'all' })}>{inSeg[1]}</button>}
        {(S.seg !== 'all' || S.q) && <button type="button" style={{ color: 'var(--ink)', textDecoration: 'underline' }} onClick={reset}>Reset all</button>}
      </div>
      <p className="cap count" aria-live="polite">{S.seg === 'all' && !S.q ? '' : `Showing ${s.length} reader${s.length === 1 ? '' : 's'}`}</p>
      <div>
        {!s.length ? (
          <p className="body" style={{ padding: '16px 0' }}>No readers match. <button className="fbtn" type="button" onClick={reset}>Reset all</button></p>
        ) : S.view === 'grid' ? (
          <div className="grid2">
            {v.map((x) => (
              <Link key={x.id} className="tile" href={`/members/${x.id}`}>
                <span className="av-wrap"><Av x={x} big /></span>
                <span className="nm">{x.n}</span>
                <span className="t2">{x.b} books &middot; {x.m} meetups</span>
                <span className="go" aria-hidden="true">&rsaquo;</span>
              </Link>
            ))}
          </div>
        ) : (
          <div>
            {v.map((x) => (
              <Link key={x.id} className="rowl" href={`/members/${x.id}`}>
                <Av x={x} />
                <span>
                  <span className="t1">{x.n}</span>
                  <span className="t2">{x.b} books &middot; {x.m} meetups</span>
                </span>
                <span className="go" aria-hidden="true">&rsaquo;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="more" ref={more} hidden={s.length <= S.shown} />
      <dialog id="fsheet" ref={sheet} aria-label="Sort" onClose={() => setOpen(false)} onClick={(e) => e.target === sheet.current && sheet.current?.close()}>
        <p className="h2">Sort</p>
        <div className="grp">
          <div>
            {SORTS.map((o) => (
              <label className="opt" key={o[0]}>
                <input type="radio" name="sort" value={o[0]} checked={S.sort === o[0]} onChange={() => set({ sort: o[0] })} />
                {o[1]}
              </label>
            ))}
          </div>
        </div>
        <div className="acts">
          <button className="fbtn" type="button" onClick={reset}>Reset all</button>
          <button className="btn" type="button" style={{ width: 'auto' }} onClick={() => sheet.current?.close()}><span>Show {s.length} reader{s.length === 1 ? '' : 's'}</span></button>
        </div>
      </dialog>
    </>
  )
}
