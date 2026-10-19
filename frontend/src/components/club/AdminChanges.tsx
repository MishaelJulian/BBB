'use client'

import * as React from 'react'
import { AdminPage, api, Back, fmt, useApi, useToast } from './AdminKit'
import { useMe } from './useMe'

interface Change {
  id: string; at: string; actor_email: string | null; action: string; label: string; type: string
  undo: { state: 'undo' } | { state: 'done' | 'expired' | 'no'; reason: string }
}
interface Result { total: number; changes: Change[] }

/** One change row: what happened, who, when, and a real Undo or the reason there is none. */
export function ChangeRow({ c, onUndo, busy }: { c: Change; onUndo: (c: Change) => void; busy: boolean }) {
  const u = c.undo
  const label = u.state === 'undo' ? 'Undo' : u.state === 'done' ? 'Undone' : u.state === 'expired' ? 'Expired' : 'Not possible'
  return (
    <div className={`chg${u.state === 'done' ? ' done' : ''}`}>
      <span className="w">{c.label}</span>
      {u.state === 'undo' ? (
        <button className="chgundo" type="button" disabled={busy} onClick={() => onUndo(c)} aria-label={`Undo: ${c.label}`}>{label}</button>
      ) : (
        <button className="chgundo" type="button" disabled aria-label={`${label}: ${u.reason}`}>{label}</button>
      )}
      <span className="t2">{fmt(c.at)} &middot; {c.actor_email ?? 'unknown'}{u.state === 'no' || u.state === 'expired' ? ` · ${u.reason}` : ''}</span>
    </div>
  )
}

export function useUndo(reload: () => void) {
  const toast = useToast()
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const undo = async (c: Change) => {
    setBusy(true)
    setErr(null)
    try {
      const r = await api<{ message: string }>(`/api/admin/changes/${c.id}/undo`, { method: 'POST' })
      toast.show(r.message)
      reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { undo, busy, err, toast: toast.node }
}

export function AdminChanges() {
  const me = useMe()
  const [type, setType] = React.useState('all')
  const [mine, setMine] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [dq, setDq] = React.useState('')
  React.useEffect(() => { const t = setTimeout(() => setDq(q), 250); return () => clearTimeout(t) }, [q])
  const path = me.state === 'admin' ? `/api/admin/changes?type=${type}&mine=${mine ? 1 : 0}&q=${encodeURIComponent(dq)}&limit=100` : null
  const { data, error, reload } = useApi<Result>(path)
  const u = useUndo(reload)
  const TYPES: [string, string][] = [['all', 'All'], ['meetups', 'Meetups'], ['members', 'Members'], ['books', 'Books']]
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Changes' }]}>
      <h1 className="h1">All changes</h1>
      <p className="cap" style={{ margin: '6px 0 0' }}>{data ? `${data.total} change${data.total === 1 ? '' : 's'} on record` : ' '}</p>
      <div className="fwrap">
        <input className="fld" type="search" placeholder="Search by person, action or date" aria-label="Search changes" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="fclear" type="button" aria-label="Clear search" onClick={() => setQ('')}>&times;</button>}
      </div>
      <div className="seg" role="group" aria-label="Type">
        {TYPES.map(([k, l]) => <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>)}
      </div>
      <div className="tg2" role="group" aria-label="Whose changes">
        <button type="button" aria-pressed={mine} onClick={() => setMine(true)}>Mine</button>
        <button type="button" aria-pressed={!mine} onClick={() => setMine(false)}>Everyone</button>
      </div>
      {u.err && <p className="amsg bad" role="alert">{u.err}</p>}
      {error && <p className="amsg bad" role="alert">{error}</p>}
      <div style={{ marginTop: 8 }}>
        {data?.changes.map((c) => <ChangeRow key={c.id} c={c} onUndo={u.undo} busy={u.busy} />)}
        {data && !data.changes.length && <p className="note" style={{ marginTop: 16 }}>No changes match.</p>}
        {!data && !error && <p className="note">Loading...</p>}
      </div>
      <p className="note" style={{ marginTop: 20 }}>Undo lasts 7 days. A change can only be undone while the thing it changed has not been changed again; when it cannot, the row says why.</p>
      <div className="nav2"><Back href="/admin" label="Admin" /></div>
      {u.toast}
    </AdminPage>
  )
}
