'use client'

import * as React from 'react'
import Link from 'next/link'
import { AdminPage, api, fmt, Rowl, Sheet, useApi } from './AdminKit'
import { ChangeRow, useUndo } from './AdminChanges'
import { clearDraft, hasDraft, loadDraft, type Draft } from '@/lib/admin/draft'
import { signOut } from '@/lib/auth'
import { refreshMe, useMe } from './useMe'

interface Overview {
  on_record: number; held: number; this_year: number; last_year: number; year: number
  trend: { n: number; d: string | null; r: number }[]
  no_readers: number; no_venue: number; no_photo: number; guests_twice: number
}
interface Changes { total: number; changes: React.ComponentProps<typeof ChangeRow>['c'][] }

const W = 340, H = 130, PL = 8, PR = 8, PT = 10, PB = 22

/** Readers per meetup, indexed to the first point (= 100): an area chart drawn as inline SVG, after the RTIH chart. No fabricated trend with fewer than 3 points. */
function Chart({ points }: { points: Overview['trend'] }) {
  const [k, setK] = React.useState<number | null>(null)
  if (points.length < 3) return <p className="note">Not enough meetups with readers recorded to draw a trend yet.</p>
  const P = points
  const v0 = P[0].r
  const idx = P.map((p) => (p.r / v0) * 100)
  const lo = Math.min(...idx, 100) - 6, hi = Math.max(...idx, 100) + 6
  const x = (i: number) => PL + (i * (W - PL - PR)) / (P.length - 1)
  const y = (v: number) => PT + ((hi - v) * (H - PT - PB)) / (hi - lo)
  const line = idx.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(P.length - 1).toFixed(1)} ${y(lo).toFixed(1)} L${x(0).toFixed(1)} ${y(lo).toFixed(1)} Z`
  const by = y(100)
  const off = Math.max(0, Math.min(1, (by - PT) / (H - PT - PB)))
  const probe = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setK(Math.max(0, Math.min(P.length - 1, Math.round((px - PL) / ((W - PL - PR) / (P.length - 1))))))
  }
  return (
    <>
      <div style={{ padding: '8px 8px 4px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Readers per meetup, meetups ${P[0].n} to ${P[P.length - 1].n}, from ${P[0].r} to ${P[P.length - 1].r}`} style={{ display: 'block', touchAction: 'pan-y' }} onPointerMove={probe} onPointerDown={probe}>
          <defs>
            <linearGradient id="sg" gradientUnits="userSpaceOnUse" x1="0" y1={PT} x2="0" y2={H - PB}><stop offset={off} stopColor="#10B981" /><stop offset={off} stopColor="#EF4444" /></linearGradient>
            <linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="0" y1={PT} x2="0" y2={H - PB}>
              <stop offset="0" stopColor="#5F9E86" stopOpacity=".4" /><stop offset={off} stopColor="#5F9E86" stopOpacity=".08" />
              <stop offset={off} stopColor="#C08478" stopOpacity=".08" /><stop offset="1" stopColor="#C08478" stopOpacity=".35" />
            </linearGradient>
          </defs>
          <line x1={PL} x2={W - PR} y1={by} y2={by} stroke="#64748b" strokeDasharray="3 3" strokeWidth="1" />
          <path d={area} fill="url(#fg)" />
          <path d={line} fill="none" stroke="url(#sg)" strokeWidth="2" strokeLinejoin="round" />
          <text x={PL} y={H - 6} fontSize="10" fill="#64748b">#{P[0].n}</text>
          <text x={W - PR} y={H - 6} fontSize="10" fill="#64748b" textAnchor="end">#{P[P.length - 1].n}</text>
          {k !== null && (
            <>
              <line x1={x(k)} x2={x(k)} y1={PT} y2={H - PB} stroke="#64748b" strokeWidth="1" />
              <circle cx={x(k)} cy={y(idx[k])} r="3.5" fill="#fff" stroke="#1a1a1a" strokeWidth="2" />
            </>
          )}
        </svg>
        <p className="note" style={{ margin: '0 4px 4px', minHeight: 21 }} aria-live="polite">
          {k === null ? `Touch the chart to read a meetup. Dashed line: the first meetup shown (100).` : `#${P[k].n} (${fmt(P[k].d)}): ${P[k].r} readers, index ${Math.round(idx[k])}`}
        </p>
      </div>
    </>
  )
}

export function AdminHome() {
  const me = useMe()
  const isAdmin = me.state === 'admin'
  const ov = useApi<Overview>(isAdmin ? '/api/admin/overview' : null)
  const [mine, setMine] = React.useState(true)
  const ch = useApi<Changes>(isAdmin ? `/api/admin/changes?limit=5&mine=${mine ? 1 : 0}` : null)
  const u = useUndo(() => { ch.reload(); ov.reload() })
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [flash, setFlash] = React.useState('')
  const [refreshedAt, setRefreshedAt] = React.useState<string | null>(null)
  const [sheet, setSheet] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const d = loadDraft()
    setDraft(hasDraft(d) ? d : null)
    try {
      const f = sessionStorage.getItem('bbb_flash')
      if (f) { setFlash(f); sessionStorage.removeItem('bbb_flash') }
      setRefreshedAt(localStorage.getItem('bbb_refreshed'))
    } catch { /* storage may be blocked */ }
  }, [])

  const o = ov.data
  const last = o?.trend[o.trend.length - 1]
  const first = o?.trend[0]
  const steps: Record<string, string> = { '1': 'The meet', '2': 'Add a reader', '3': 'Books', r: 'Check the details' }
  const nr = draft?.readers?.length ?? 0
  const next: [string, string, string][] = []
  if (o) {
    if (o.no_readers) next.push(['/admin/meetups?tab=nr', `${o.no_readers} meetups have no readers recorded`, 'Open the list'])
    if (o.no_venue) next.push(['/admin/meetups?tab=nv', `${o.no_venue} meetups have no venue recorded`, 'Open the list'])
    if (o.guests_twice) next.push(['/admin/members?tab=guest', `${o.guests_twice} guests have attended twice`, 'Make them members?'])
    if (o.no_photo) next.push(['/admin/meetups?tab=np', `${o.no_photo} meetups have no group photo`, 'Open the list'])
  }
  const refresh = async () => {
    setBusy(true)
    setMsg('Refreshing...')
    try {
      const r = await api<{ at: string }>('/api/admin/refresh', { method: 'POST' })
      try { localStorage.setItem('bbb_refreshed', r.at) } catch { /* ignore */ }
      setRefreshedAt(r.at)
      setMsg('Refreshed. Recent changes now show on the lists and pages.')
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const time = (s: string) => `${fmt(s)}, ${new Date(s).toTimeString().slice(0, 5)}`

  return (
    <AdminPage crumbs={[{ label: 'Admin' }]}>
      <h1 className="h1">Admin</h1>
      <p className="body" style={{ marginTop: 8 }}>{o ? `${o.on_record} meetups on record of ${o.held} held` : ' '}</p>
      {ov.error && <p className="amsg bad" role="alert">{ov.error}</p>}
      <p className="note" aria-live="polite" style={{ margin: '4px 0 0', color: '#12295a' }}>{flash}</p>
      <div style={{ height: 28 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link className="btn" href="/admin/manage-db"><span>Manage DB (Meetups &amp; Goodreads API)</span><span aria-hidden="true">&rsaquo;</span></Link>
        <Link className="btn" href="/admin/record" style={{ background: '#1a1a1a' }}><span>Record a meetup (Step-by-step)</span><span aria-hidden="true">&rsaquo;</span></Link>
      </div>
      {draft && (
        <div className="draft" role="group" aria-label="Unfinished meetup">
          <span className="fold" aria-hidden="true" />
          <div className="in">
            <div className="lab">Draft</div>
            <p className="what">{draft.date ? fmt(draft.date) : 'No date yet'} &middot; {steps[draft.step] ?? ''}{nr ? ` · ${nr} reader${nr === 1 ? '' : 's'}` : ''}</p>
            <div className="acts">
              <Link href={`/admin/record?s=${draft.step || 1}${draft.who !== null && draft.who !== undefined ? `&w=${draft.who}` : ''}`}>Resume</Link>
              <button type="button" onClick={() => { clearDraft(); setDraft(null) }}>Discard</button>
            </div>
          </div>
        </div>
      )}

      <section className="block" aria-labelledby="yh">
        <p className="sec" id="yh">This year against last</p>
        {o && (
          <div className="stat">
            <div><b>{o.this_year}</b>meetups in {o.year}<br />({o.year - 1}: {o.last_year})</div>
            {last && first && <div><b>{last.r}</b>readers at #{last.n}<br />(#{first.n}: {first.r})</div>}
          </div>
        )}
        <div className="panel">
          <div className="pnh">{o && first && last ? `Readers per meetup, #${first.n} to #${last.n}` : 'Readers per meetup'}</div>
          {o && <Chart points={o.trend} />}
        </div>
        {o && <p className="note">Readers are the people recorded as attending. {o.no_readers} meetups have none recorded yet.</p>}
      </section>

      <section className="block" aria-labelledby="th">
        <p className="sec" id="th">Tools</p>
        <div style={{ marginTop: 8 }}>
          <Rowl href="/admin/manage-db" t1="Manage DB" t2="Full archive workspace: create/edit meetups, add books via Goodreads API, photos & PDFs" />
          <Rowl href="/admin/members" t1="Members" t2="Search, edit, hide or restore" />
          <Rowl href="/admin/meetups" t1="Meetups" t2="Photo, PDF, enrich, delete" />
          <Rowl href="/admin/books" t1="Books" t2="Search and edit" />
          <Rowl href="/admin/codes" t1="Codes" t2="Personal invite links" />
          <Rowl href="/admin/picks" t1="Closet Picks" t2="Who picked which books" />
          <Rowl href="/admin/notify" t1="Notify members" t2="Draft a message" />
          <Rowl t1="Refresh site data" t2={refreshedAt ? `Refreshed ${time(refreshedAt)}` : 'Make recent changes show everywhere'} onClick={() => { setMsg(null); setSheet(true) }} />
          <Rowl href="/admin/changes" t1="All changes" t2="Everything done here, with Undo" />
          <Rowl t1="Sign out of Admin" t2="End your admin session on this device" onClick={async () => { await signOut(); await refreshMe() }} />
        </div>
      </section>

      <section className="block" aria-labelledby="dh">
        <p className="sec" id="dh">Do next</p>
        <div style={{ marginTop: 8 }}>
          {next.map(([href, t1, t2]) => <Rowl key={href} href={href} t1={t1} t2={t2} />)}
          {o && !next.length && <p className="note">Nothing waiting.</p>}
        </div>
      </section>

      <section className="block" aria-labelledby="rh">
        <div className="rowx">
          <p className="sec" id="rh">Recent changes</p>
          <div className="tg2" role="group" aria-label="Whose changes">
            <button type="button" aria-pressed={mine} onClick={() => setMine(true)}>Mine</button>
            <button type="button" aria-pressed={!mine} onClick={() => setMine(false)}>Everyone</button>
          </div>
        </div>
        {u.err && <p className="amsg bad" role="alert">{u.err}</p>}
        <div style={{ marginTop: 4 }}>
          {ch.data?.changes.map((c) => <ChangeRow key={c.id} c={c} onUndo={u.undo} busy={u.busy} />)}
          {ch.data && !ch.data.changes.length && <p className="note">No changes yet.</p>}
        </div>
        <Link className="link" href="/admin/changes">All changes &rsaquo;</Link>
      </section>
      <div className="sp32" />
      {u.toast}

      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <p className="h2">Refresh site data</p>
        <p className="body">Makes your recent changes show everywhere: the Library, the lists and the meetup pages.</p>
        {msg && <p className="amsg" role="status">{msg}</p>}
        <div className="foot">
          <button className="x" type="button" onClick={() => setSheet(false)}>Close</button>
          <button className="btn" type="button" disabled={busy} onClick={refresh}><span>Refresh</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>
    </AdminPage>
  )
}
