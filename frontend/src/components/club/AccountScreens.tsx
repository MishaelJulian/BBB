'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, changePassword, signOut } from '@/lib/auth'
import { PasswordField } from './AuthForm'
import { refreshMe, useMe } from './useMe'

type Screen = 'list' | 'email' | 'profile' | 'password' | 'record' | 'privacy'
const MAIL = 'brokebibliophilesbangalore@gmail.com'

function Row({ s, t1, t2 }: { s: Screen; t1: string; t2?: string }) {
  return (
    <Link className="rowl" href={`/account?s=${s}`}>
      <span><span className="t1">{t1}</span>{t2 && <span className="t2">{t2}</span>}</span>
      <span className="go" aria-hidden="true">&rsaquo;</span>
    </Link>
  )
}

export function AccountScreens() {
  const me = useMe()
  const router = useRouter()
  const [s, setS] = React.useState<Screen>('list')
  const [bio, setBio] = React.useState('')
  const [bioLoaded, setBioLoaded] = React.useState(false)
  const [cur, setCur] = React.useState('')
  const [next, setNext] = React.useState('')
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [rec, setRec] = React.useState<{ name: string; code: string | null } | null>(null)

  React.useEffect(() => {
    const v = (new URLSearchParams(window.location.search).get('s') || 'list') as Screen
    setS(['list', 'email', 'profile', 'password', 'record', 'privacy'].includes(v) ? v : 'list')
  }, [])
  React.useEffect(() => {
    if (me.state !== 'member' && me.state !== 'admin') return
    void authFetch('/api/me').then(async (r) => { if (r.ok) { const j = await r.json(); setBio(j.member?.bio ?? ''); setBioLoaded(true) } })
    void authFetch('/api/me/card').then(async (r) => { if (r.ok) { const j = await r.json(); setRec({ name: j.name, code: j.code }) } })
  }, [me.state])

  if (me.state === 'loading') return <p className="body">One moment...</p>
  if (me.state === 'out')
    return (
      <>
        <h1 className="h1">Profile and account</h1>
        <p className="body" style={{ marginTop: 12 }}>Sign in to manage your account.</p>
        <div className="sp24" />
        <Link className="btn" href="/login"><span>Sign in</span><span aria-hidden="true">&rsaquo;</span></Link>
      </>
    )
  const linked = me.state === 'member' || me.state === 'admin'
  const back = (
    <Link className="back" href={s === 'list' ? '/me' : '/account'}><span aria-hidden="true">&lsaquo;</span>{s === 'list' ? 'Me' : 'Profile and account'}</Link>
  )
  const note = msg && <p className={`msg2${msg.ok ? '' : ' bad'}`} role={msg.ok ? 'status' : 'alert'}>{msg.t}</p>

  if (s === 'list')
    return (
      <>
        {back}
        <h1 className="h1">Profile and account</h1>
        <p className="grp">Sign-in and security</p>
        <div><Row s="email" t1="Email" t2={`${me.email ?? ''} (read only)`} /><Row s="password" t1="Password" t2="Change it" /></div>
        <p className="grp">Your record</p>
        <div><Row s="profile" t1="Profile" t2={linked && rec ? rec.name : 'No record linked'} /><Row s="record" t1="Linked record" t2={linked && rec?.code ? rec.code : 'Link a record'} /></div>
        <p className="grp">Your data</p>
        <div><Row s="privacy" t1="Privacy and requests" t2="Your rights and how to use them" /></div>
        <p className="grp">Session</p>
        <button
          className="rowl"
          type="button"
          style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderTop: '1px solid var(--line2)', borderBottom: '1px solid var(--line2)', cursor: 'pointer', font: 'inherit' }}
          onClick={async () => { await signOut(); await refreshMe(); router.push('/') }}
        >
          <span><span className="t1">Sign out</span></span><span className="go" aria-hidden="true">&rsaquo;</span>
        </button>
      </>
    )
  if (s === 'email')
    return (
      <>
        {back}
        <h1 className="h1">Email</h1>
        <p className="body" style={{ marginTop: 8 }}>This is the email you sign in with. It is read only for now. To change it, write to <a className="link" href={`mailto:${MAIL}`}>{MAIL}</a>.</p>
        <label className="l" htmlFor="e">Email</label>
        <div className="field"><input id="e" value={me.email ?? ''} readOnly /></div>
      </>
    )
  if (s === 'profile')
    return (
      <>
        {back}
        <h1 className="h1">Profile</h1>
        <label className="l" htmlFor="n">Name</label>
        <div className="field"><input id="n" value={rec?.name ?? ''} readOnly /></div>
        <p className="cap" style={{ marginTop: 6 }}>{linked ? 'Your name comes from the club record. Ask an admin to change it.' : 'Link your record to see your name.'}</p>
        {linked && bioLoaded && (
          <>
            <label className="l" htmlFor="bio">Bio</label>
            <div className="field"><textarea id="bio" maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
            <p className="cap" style={{ marginTop: 4, textAlign: 'right' }}>{bio.length} of 1000</p>
            {note}
            <div className="foot2">
              <button
                className="btn"
                type="button"
                disabled={busy}
                style={{ width: '100%' }}
                onClick={async () => {
                  setBusy(true)
                  setMsg(null)
                  const r = await authFetch('/api/me/profile', { method: 'PUT', body: JSON.stringify({ bio: bio.trim() || null }) })
                  const j = await r.json().catch(() => null)
                  setMsg(r.ok ? { ok: true, t: 'Saved.' } : { ok: false, t: j?.detail || j?.error?.message || 'Could not save.' })
                  setBusy(false)
                }}
              >
                <span>{busy ? 'Saving...' : 'Save bio'}</span><span aria-hidden="true">&rsaquo;</span>
              </button>
            </div>
          </>
        )}
      </>
    )
  if (s === 'password')
    return (
      <>
        {back}
        <h1 className="h1">Password</h1>
        <PasswordField id="cp" label="Current password" value={cur} onChange={setCur} auto="current-password" />
        <PasswordField id="np" label="New password (8 or more characters)" value={next} onChange={setNext} auto="new-password" />
        {note}
        <div className="foot2">
          <button
            className="btn"
            type="button"
            disabled={busy}
            style={{ width: '100%' }}
            onClick={async () => {
              setMsg(null)
              if (!cur) return setMsg({ ok: false, t: 'Enter your current password.' })
              if (next.length < 8) return setMsg({ ok: false, t: 'Use 8 or more characters.' })
              setBusy(true)
              try {
                await changePassword(cur, next)
                setCur('')
                setNext('')
                setMsg({ ok: true, t: 'Password changed.' })
              } catch (e) {
                setMsg({ ok: false, t: e instanceof Error ? e.message : 'Could not change the password.' })
              } finally {
                setBusy(false)
              }
            }}
          >
            <span>{busy ? 'Changing...' : 'Change password'}</span><span aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      </>
    )
  if (s === 'record')
    return (
      <>
        {back}
        <h1 className="h1">Linked record</h1>
        {linked ? (
          <>
            <p className="body" style={{ marginTop: 8 }}>{rec?.name}{rec?.code ? ` · ${rec.code}` : ''}</p>
            <p className="cap" style={{ marginTop: 8 }}>Not you? Ask an admin to unlink it: <a className="link" href={`mailto:${MAIL}`}>{MAIL}</a>.</p>
          </>
        ) : (
          <p className="body" style={{ marginTop: 8 }}>No record is linked yet. <Link className="link" href="/me">Link your record from Me</Link>.</p>
        )}
      </>
    )
  return (
    <>
      {back}
      <h1 className="h1">Privacy and requests</h1>
      <p className="body" style={{ marginTop: 8 }}>Under India&apos;s data protection law you can ask us to show you what we hold, correct or update it, erase it, or let someone you name act for you. You can also withdraw your consent at any time.</p>
      <p className="body" style={{ marginTop: 12 }}>Write to <a className="link" href={`mailto:${MAIL}`}>{MAIL}</a> with your sign-in email. We answer within 90 days. The same address takes complaints.</p>
      <p style={{ marginTop: 12 }}><Link className="link" href="/privacy">Read the Privacy notice</Link></p>
    </>
  )
}
