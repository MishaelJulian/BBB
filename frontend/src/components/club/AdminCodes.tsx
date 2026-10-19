'use client'

import * as React from 'react'
import { AdminPage, api, Back, fmt, Msg, Sheet, useApi } from './AdminKit'
import { InviteSheet } from './AdminInvite'
import { useMe } from './useMe'

interface Code { id: string; member_id: string; member: string; by: string | null; issued_at: string; expires_at: string; status: 'Active' | 'Used' | 'Expired' | 'Revoked'; kind?: 'claim' | 'reset' }
interface Member { id: string; name: string; code: string | null; linked: boolean }

export function AdminCodes() {
  const me = useMe()
  const ok = me.state === 'admin'
  const codes = useApi<Code[]>(ok ? '/api/admin/codes' : null)
  const [tab, setTab] = React.useState<'active' | 'used' | 'expired'>('active')
  const [pick, setPick] = React.useState<Code | null>(null)
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [newOpen, setNewOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [target, setTarget] = React.useState<{ id: string; name: string } | null>(null)
  const members = useApi<{ members: Member[] }>(ok && newOpen ? '/api/admin/members' : null)

  const inTab = (c: Code, t: string) => (t === 'active' ? c.status === 'Active' : t === 'used' ? c.status === 'Used' : c.status === 'Expired' || c.status === 'Revoked')
  const L = codes.data ?? []
  const rows = L.filter((c) => inTab(c, tab))
  const sug = q.trim().length < 2 ? [] : (members.data?.members ?? []).filter((m) => !m.linked && `${m.name} ${m.code ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)

  const revoke = async (c: Code) => {
    setBusy(true)
    setMsg(null)
    try {
      await api(`/api/admin/codes/${c.id}/revoke`, { method: 'POST' })
      setPick(null)
      codes.reload()
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Codes' }]}>
      <Back href="/admin" label="Admin" />
      <h1 className="h1">Codes</h1>
      <p className="cap" style={{ marginTop: 6 }}>Each personal invite link lets one person make their own account and link it to one member record. It works once and expires in 14 days. A reset code lets a member set a new password. It works once and expires in 24 hours. A code is shown only when it is made.</p>
      <div className="tabs" role="group" aria-label="Show">
        {([['active', 'Active'], ['used', 'Used'], ['expired', 'Expired']] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l} {codes.data ? L.filter((c) => inTab(c, k)).length : ''}</button>
        ))}
      </div>
      {codes.error && <p className="amsg bad" role="alert">{codes.error}</p>}
      <div>
        {rows.map((c) => (
          <button key={c.id} className="mr" type="button" onClick={() => { setMsg(null); setPick(c) }}>
            <span className="t1">{c.member} &middot; {c.kind === 'reset' ? 'Reset code' : 'Claim link'}</span>
            <span className="t2">Issued {fmt(c.issued_at)} by {c.by ?? 'an admin'} &middot; {c.status === 'Active' ? `expires ${fmt(c.expires_at)}` : c.status}</span>
          </button>
        ))}
        {codes.data && !rows.length && <p className="body" style={{ marginTop: 16 }}>{tab === 'active' ? 'No active codes. Make one from a member page, or with New code.' : 'Nothing here.'}</p>}
      </div>
      <div className="pad" />
      <div className="fpair right"><button className="btn" type="button" onClick={() => { setQ(''); setTarget(null); setNewOpen(true) }}><span>+ New code</span><span aria-hidden="true">&rsaquo;</span></button></div>

      <Sheet open={!!pick} onClose={() => setPick(null)}>
        <p className="h2">{pick?.member} &middot; {pick?.kind === 'reset' ? 'Reset code' : 'Claim link'}</p>
        <p className="cap">Status: {pick?.status}. Issued {fmt(pick?.issued_at)} by {pick?.by ?? 'an admin'}.{pick?.status === 'Active' ? ` Expires ${fmt(pick.expires_at)}.` : ''}</p>
        <p className="cap" style={{ marginTop: 6 }}>The code itself is not shown again.</p>
        <Msg m={msg} />
        <div className="foot">
          <button className="x" type="button" onClick={() => setPick(null)}>Close</button>
          {pick?.status === 'Active' && <button className="btn dg" type="button" disabled={busy} onClick={() => revoke(pick)}><span>Revoke code</span><span aria-hidden="true">&rsaquo;</span></button>}
        </div>
      </Sheet>

      <Sheet open={newOpen && !target} onClose={() => setNewOpen(false)}>
        <p className="h2">New code</p>
        <label className="fl" htmlFor="nq">Member</label>
        <input className="fld" id="nq" type="search" autoComplete="off" placeholder="Name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="sug">
          {sug.map((m) => <button key={m.id} type="button" onClick={() => setTarget({ id: m.id, name: m.name })}>{m.name}<small>{m.code}</small></button>)}
        </div>
        <p className="cap" style={{ marginTop: 8 }}>Only members who have not yet linked an account are listed.</p>
        <div className="foot"><button className="x" type="button" onClick={() => setNewOpen(false)}>Cancel</button></div>
      </Sheet>
      <InviteSheet member={newOpen ? target : null} onClose={() => { setTarget(null); setNewOpen(false) }} onDone={codes.reload} />
    </AdminPage>
  )
}
