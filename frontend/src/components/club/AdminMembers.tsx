'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Act, AdminPage, api, Back, fmt, Msg, Sheet, useApi, useToast } from './AdminKit'
import { InviteSheet } from './AdminInvite'
import { useMe } from './useMe'

interface Member { id: string; name: string; status: string; code: string | null; hidden: boolean; linked: boolean; books: number; meetups: number }
interface Removed { id: string; name: string; removed_at: string; books: number }
interface Data { members: Member[]; removed: Removed[] }
const STATUS: Record<string, string> = { member: 'Member', byob: 'BYOB', guest: 'Guest' }

function useData() {
  const me = useMe()
  return useApi<Data>(me.state === 'admin' ? '/api/admin/members' : null)
}

export function AdminMembers({ initialTab = 'all' }: { initialTab?: string }) {
  const { data, error } = useData()
  const [tab, setTab] = React.useState(initialTab)
  const [q, setQ] = React.useState('')
  const [acct, setAcct] = React.useState<'any' | 'linked' | 'not'>('any')
  const [shown, setShown] = React.useState(40)
  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t) setTab(t)
  }, [])
  const live = data?.members ?? []
  const cnt: Record<string, number> = {
    all: live.length, member: live.filter((m) => m.status === 'member').length, byob: live.filter((m) => m.status === 'byob').length,
    guest: live.filter((m) => m.status === 'guest').length, hidden: live.filter((m) => m.hidden).length, removed: data?.removed.length ?? 0,
  }
  const t = q.trim().toLowerCase()
  const match = (n: string, c: string | null) => !t || `${n} ${c ?? ''}`.toLowerCase().includes(t)
  const rows = tab === 'removed' ? [] : live.filter((m) => (tab === 'all' || (tab === 'hidden' ? m.hidden : m.status === tab)) && (acct === 'any' || (acct === 'linked') === m.linked) && match(m.name, m.code))
  const removed = tab === 'removed' ? (data?.removed ?? []).filter((r) => match(r.name, null)) : []
  const total = tab === 'removed' ? removed.length : rows.length
  const TABS: [string, string][] = [['all', 'All'], ['member', 'Member'], ['byob', 'BYOB'], ['guest', 'Guest'], ['hidden', 'Hidden'], ['removed', 'Removed']]
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { label: 'Members' }]}>
      <Back href="/admin" label="Admin" />
      <h1 className="h1">Members</h1>
      <label className="cap" htmlFor="mq" style={{ display: 'block', marginTop: 10 }}>Search name or code</label>
      <input className="search" id="mq" type="search" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setShown(40) }} />
      <div className="tabs" role="group" aria-label="Show">
        {TABS.map(([k, l]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); setShown(40) }}>{l} {data ? cnt[k] : ''}</button>)}
      </div>
      <div className="tabs" role="group" aria-label="Account">
        {([['any', 'Any account'], ['linked', 'Linked'], ['not', 'Not linked']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={acct === k} onClick={() => setAcct(k)}>{l}</button>)}
      </div>
      <p className="cap" aria-live="polite">{data ? `${total} shown` : 'Loading...'}</p>
      {error && <p className="amsg bad" role="alert">{error}</p>}
      <div>
        {rows.slice(0, shown).map((m) => (
          <Link key={m.id} className="mr" href={`/admin/members/${encodeURIComponent(m.id)}`}>
            <span className="t1">{m.name}</span>
            <span className="t2">{m.code ?? 'No code'} &middot; {STATUS[m.status] ?? m.status}{m.hidden ? ' · Hidden' : ''} &middot; {m.linked ? 'Linked' : 'Not linked'}</span>
          </Link>
        ))}
        {removed.slice(0, shown).map((r) => (
          <Link key={r.id} className="mr" href={`/admin/members/${encodeURIComponent(r.id)}`}>
            <span className="t1">{r.name}</span>
            <span className="t2">Removed {fmt(r.removed_at)} &middot; {r.books} book{r.books === 1 ? '' : 's'}</span>
          </Link>
        ))}
        {data && !total && <p className="body" style={{ marginTop: 12 }}>Nobody here.</p>}
      </div>
      {total > shown && <button className="rd" type="button" onClick={() => setShown((s) => s + 40)}>Show more ({total - shown})</button>}
    </AdminPage>
  )
}

export function AdminMember({ id }: { id: string }) {
  const router = useRouter()
  const { data, error, reload } = useData()
  const toast = useToast()
  const [sheet, setSheet] = React.useState<null | 'name' | 'make' | 'code' | 'remove'>(null)
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [name, setName] = React.useState('')

  const m = data?.members.find((x) => x.id === id)
  const gone = data?.removed.find((x) => x.id === id)
  const run = async (fn: () => Promise<string | void>, after?: () => void) => {
    setBusy(true)
    setMsg(null)
    try {
      const t = await fn()
      reload()
      setSheet(null)
      if (t) toast.show(t)
      after?.()
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  const close = () => { setSheet(null); setMsg(null) }

  const status = m ? STATUS[m.status] ?? m.status : ''
  return (
    <AdminPage crumbs={[{ href: '/admin', label: 'Admin' }, { href: '/admin/members', label: 'Members' }, { label: m?.name ?? gone?.name ?? 'Member' }]}>
      <Back href="/admin/members" label="Members" />
      {error && <p className="amsg bad" role="alert">{error}</p>}
      {data && !m && !gone && <h1 className="h1">Not found</h1>}
      {gone && (
        <>
          <h1 className="abig">{gone.name}</h1>
          <p className="cap" style={{ marginTop: 4 }}>Removed {fmt(gone.removed_at)}</p>
          <p className="amsg bad">This member is removed. A copy is kept, and you can restore it{(Date.now() - new Date(gone.removed_at).getTime()) / 864e5 > 7 ? ' (the 7-day undo has passed; restoring still works from here)' : ' (undo is open for 7 days)'}.</p>
          <Msg m={msg} />
          <div style={{ marginTop: 16 }}>
            <Act t="Restore member" onClick={() => run(async () => { await api(`/api/admin/members/${encodeURIComponent(id)}/restore`, { method: 'POST' }); return 'Member restored.' })} />
          </div>
        </>
      )}
      {m && (
        <>
          <h1 className="abig">{m.name}</h1>
          <p className="cap" style={{ marginTop: 4 }}>{m.code ?? 'No code'}</p>
          <p className="body" style={{ marginTop: 8 }}>{status} &middot; Account: {m.linked ? 'linked' : 'not linked'} &middot; {m.books} books &middot; {m.meetups} meetups{m.hidden ? ' · Hidden from the public site' : ''}</p>
          <div style={{ marginTop: 16 }}>
            <Act t="Edit name" onClick={() => { setName(m.name); setSheet('name') }} />
            {m.status !== 'member' && <Act t="Make a member" sub={m.status === 'byob' ? 'Bring-your-own-book reader' : 'Guest'} onClick={() => setSheet('make')} />}
            {!m.linked
              ? <Act t="Make a claim code" sub="A personal invite link, so they can link their account to this record" onClick={() => setSheet('code')} />
              : <Act t="Account is linked" sub="They already claimed this record" off />}
            <Act t={m.hidden ? 'Show on the public site again' : 'Hide from the public site'} onClick={() => run(async () => { await api(`/api/admin/members/${encodeURIComponent(id)}/toggle-hide`, { json: { is_hidden: !m.hidden } }); return m.hidden ? `${m.name} is shown again.` : `${m.name} is hidden.` })} />
            <Act t="Remove member" sub="A copy is kept. Undo for 7 days" danger onClick={() => setSheet('remove')} />
          </div>
        </>
      )}

      <Sheet open={sheet === 'name'} onClose={close}>
        <p className="h2">Edit name</p>
        <label className="fl" htmlFor="nn">Name</label>
        <input className="fld" id="nn" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="cap" style={{ marginTop: 8 }}>Names follow the club&apos;s spelling rules: each word starts with a capital.</p>
        <Msg m={msg} />
        <div className="foot">
          <button className="x" type="button" onClick={close}>Cancel</button>
          <button className="btn" type="button" disabled={busy || !name.trim()} onClick={() => run(async () => { const r = await api<{ message: string }>(`/api/admin/members/${encodeURIComponent(id)}/rename`, { json: { name } }); return r.message })}><span>Save name</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'make'} onClose={close}>
        <p className="h2">Make {m?.name} a member?</p>
        <p className="body">They will count as a member everywhere. You can undo it from All changes for 7 days.</p>
        <Msg m={msg} />
        <div className="foot">
          <button className="x" type="button" onClick={close}>Cancel</button>
          <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { await api(`/api/admin/members/${encodeURIComponent(id)}/make-member`, { method: 'POST' }); return `${m?.name} is now a member.` })}><span>Make a member</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>

      <InviteSheet member={sheet === 'code' && m ? { id: m.id, name: m.name } : null} onClose={close} onDone={reload} />

      <Sheet open={sheet === 'remove'} onClose={close}>
        <p className="h2">Remove {m?.name}?</p>
        <p className="body">They disappear from the site and their books stay on their meetups. A copy is kept: you can restore them from All changes for 7 days, and later from Removed in Members.</p>
        <Msg m={msg} />
        <div className="foot">
          <button className="x" type="button" onClick={close}>Cancel</button>
          <button className="btn dg" type="button" disabled={busy} onClick={() => run(async () => { await api(`/api/admin/members/${encodeURIComponent(id)}`, { method: 'DELETE' }) }, () => router.push('/admin/members?tab=removed'))}><span>Remove member</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </Sheet>
      {toast.node}
    </AdminPage>
  )
}
