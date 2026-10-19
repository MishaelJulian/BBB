'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth'
import { AuthForm, type Invite } from './AuthForm'
import { refreshMe, useMe } from './useMe'

/**
 * The personal invite link: /join#code=XXXXX-XXXXX (and &pin=1 when the admin set a PIN). The code is after the # so it is never sent to a server.
 * The link lets its holder make their OWN account and attach it to one record; it never signs anyone in.
 */
export function JoinFlow() {
  const router = useRouter()
  const me = useMe()
  const [code, setCode] = React.useState<string | null | undefined>(undefined)
  const [needsPin, setNeedsPin] = React.useState(false)
  const [pin, setPin] = React.useState('')
  const [invite, setInvite] = React.useState<Invite | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const preview = React.useCallback(async (c: string, p?: string) => {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/join/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c, pin: p }) })
      const j = await r.json().catch(() => null)
      if (!r.ok) return setError(j?.detail || j?.error?.message || 'That invite is not valid, has expired, or was already used.')
      setInvite({ code: c, pin: p, name: j.name })
    } finally {
      setBusy(false)
    }
  }, [])

  React.useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1))
    const c = h.get('code')
    setCode(c)
    if (!c) return
    if (h.get('pin') === '1') setNeedsPin(true)
    else void preview(c)
  }, [preview])

  if (code === undefined) return <p className="body">One moment...</p>
  if (!code) {
    return (
      <>
        <h1 className="h1">Invite link</h1>
        <p className="body" style={{ marginTop: 12 }}>This link is missing its invite code. Ask an admin to send it again.</p>
        <div className="sp24" />
        <Link className="btn" href="/"><span>Go to Home</span><span aria-hidden="true">&rsaquo;</span></Link>
      </>
    )
  }
  if (needsPin && !invite) {
    return (
      <div className="auth">
        <h1 className="h1">Your invite</h1>
        <p className="body" style={{ marginTop: 8 }}>Enter the PIN the admin gave you separately.</p>
        <form onSubmit={(e) => { e.preventDefault(); void preview(code, pin.replace(/\s/g, '')) }}>
          <label className="l" htmlFor="pin">PIN</label>
          <div className="field"><input id="pin" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
          {error && <p className="notice err" role="alert">{error}</p>}
          <div className="sp16" />
          <button className="btn" type="submit" disabled={busy || !pin}><span>{busy ? 'Checking...' : 'Continue'}</span><span aria-hidden="true">&rsaquo;</span></button>
        </form>
      </div>
    )
  }
  if (!invite) {
    return (
      <>
        <h1 className="h1">Invite link</h1>
        <p className="body" style={{ marginTop: 12 }}>{busy ? 'Checking your invite...' : error ?? ''}</p>
        {!busy && <p className="cap" style={{ marginTop: 8 }}>Ask an admin for a new invite link.</p>}
      </>
    )
  }
  // already signed in with an account that has no record yet: link directly
  if (me.state === 'new' || me.state === 'admin' || me.state === 'member') {
    return (
      <div className="auth">
        <h1 className="h1">You&apos;re invited as {invite.name}</h1>
        {me.state === 'member' ? (
          <p className="body" style={{ marginTop: 12 }}>This account is already linked to a record, so this invite cannot be used with it.</p>
        ) : (
          <>
            <p className="body" style={{ marginTop: 12 }}>Link this account ({me.email}) to {invite.name}&apos;s record?</p>
            {error && <p className="notice err" role="alert">{error}</p>}
            <div className="sp16" />
            <button
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError(null)
                const r = await authFetch('/api/me/claim', { method: 'POST', body: JSON.stringify({ code: invite.code, pin: invite.pin }) })
                if (r.ok) {
                  await refreshMe()
                  router.push('/me')
                  return
                }
                const j = await r.json().catch(() => null)
                setError(j?.detail || j?.error?.message || 'The invite did not work.')
                setBusy(false)
              }}
            >
              <span>{busy ? 'Linking...' : 'Link my record'}</span><span aria-hidden="true">&rsaquo;</span>
            </button>
          </>
        )}
      </div>
    )
  }
  return <AuthForm invite={invite} />
}
