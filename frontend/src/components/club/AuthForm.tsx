'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, recoveryStatus, safeNext, signIn, signUp } from '@/lib/auth'
import { Turnstile, type TurnstileHandle } from '@/components/auth/Turnstile'
import { refreshMe } from './useMe'

export interface Invite {
  code: string
  pin?: string
  name: string
}

export function PasswordField({ id, label, value, onChange, auto, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; auto: string; hint?: string }) {
  const [show, setShow] = React.useState(false)
  return (
    <>
      <label className="l" htmlFor={id}>{label}</label>
      <div className="field">
        <input id={id} type={show ? 'text' : 'password'} autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} />
        <button className="show" type="button" aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && <p className="cap" style={{ margin: '4px 0 0' }}>{hint}</p>}
    </>
  )
}

async function claim(invite: Invite): Promise<string | null> {
  const r = await authFetch('/api/me/claim', { method: 'POST', body: JSON.stringify({ code: invite.code, pin: invite.pin }) })
  if (r.ok) return null
  try {
    const j = await r.json()
    return j?.detail || j?.error?.message || 'The invite did not work.'
  } catch {
    return 'The invite did not work.'
  }
}

/** Sign in and create account, with the standalone data notice (DPDP) on sign-up. With an invite, a successful sign-in or sign-up links the record. */
export function AuthForm({ initialMode = 'in', invite }: { initialMode?: 'in' | 'up'; invite?: Invite }) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'in' | 'up'>(invite ? 'up' : initialMode)
  const [email, setEmail] = React.useState('')
  const [pw, setPw] = React.useState('')
  const [agree, setAgree] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [after, setAfter] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [token, setToken] = React.useState<string | null>(null)
  const [keep, setKeep] = React.useState(false)
  const [top, setTop] = React.useState<string | null>(null)
  const captcha = React.useRef<TurnstileHandle>(null)
  const up = mode === 'up'
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('expired') === '1') setTop('Your previous session has expired. Sign in again.')
    else if (q.get('reset') === '1') setTop('Your password was changed. Sign in with the new one.')
  }, [])

  const target = () => safeNext(new URLSearchParams(window.location.search).get('next'))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setAfter(null)
    if (!email.trim() || !pw) return setError('Enter your email and password.')
    if (up && pw.length < 8) return setError('Use 8 or more characters.')
    if (up && !agree) return setError('Tick the box to agree to the Terms and the Privacy notice.')
    setBusy(true)
    try {
      if (up) {
        const signedIn = await signUp(email.trim(), pw, token ?? undefined)
        if (!signedIn) {
          setAfter('Account created. Check your email to confirm it, then sign in.')
          setMode('in')
          return
        }
      } else {
        await signIn(email.trim(), pw, token ?? undefined, keep)
      }
      if (invite) {
        const problem = await claim(invite)
        if (problem) {
          await refreshMe()
          setError(`Your account is ready, but the invite did not link: ${problem}`)
          setAfter('You can sign in later and link your record from Me with a new invite from an admin.')
          return
        }
      }
      await refreshMe()
      // No recovery phrase yet (a new account, or the first sign-in since phrases began): make one now, shown once.
      const rec = await recoveryStatus()
      router.push(rec && !rec.has ? `/recovery?first=1&next=${encodeURIComponent(target())}` : target())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      captcha.current?.reset() // a bot-check token works once
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      {top && <p className="notice" role="status">{top}</p>}
      <h1 className="h1">{up ? 'Create an account' : 'Sign in'}</h1>
      <p className="body" style={{ marginTop: 8 }}>
        {invite ? `You're invited as ${invite.name}. ${up ? 'Create your account to link your record.' : 'Sign in to link your record.'}` : up ? 'Join BBB with your email.' : 'Welcome back to BBB.'}
      </p>
      <form onSubmit={submit} noValidate>
        <label className="l" htmlFor="email">Email</label>
        <div className="field">
          <input id="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <PasswordField id="pw" label="Password" value={pw} onChange={setPw} auto={up ? 'new-password' : 'current-password'} hint={up ? '8 or more characters.' : undefined} />
        {!up && (
          <label className="keep">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            <span>Keep me signed in<small>Members: 90 days instead of 30. Admins: always 24 hours. Only on a device that only you use.</small></span>
          </label>
        )}
        {up && (
          <>
            <div className="dpnote" role="note">
              <b>What we keep</b>Your email and password, to sign you in. Your name and books come from the club&apos;s records. Your bio, wishlist and picks only if you add them.
              <b>Why</b>To run the club site, nothing else.
              <b>Your rights</b>See, correct, update or erase your data, withdraw consent, or nominate someone to act for you. Write to{' '}
              <a href="mailto:brokebibliophilesbangalore@gmail.com" style={{ color: 'var(--ink)' }}>brokebibliophilesbangalore@gmail.com</a>. We answer within 90 days.
            </div>
            <label className="consent">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I agree to the <Link href="/terms">Terms</Link> and the <Link href="/privacy">Privacy notice</Link>, and to the use of my data described above.</span>
            </label>
          </>
        )}
        <div style={{ marginTop: 16 }}><Turnstile ref={captcha} onToken={setToken} /></div>
        {error && <p className="notice err" role="alert">{error}</p>}
        {after && <p className="notice" role="status">{after}</p>}
        <div className="sp16" />
        <button className="btn" type="submit" disabled={busy}>
          <span>{busy ? (up ? 'Creating...' : 'Signing in...') : up ? 'Create account' : 'Sign in'}</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </form>
      {!up && (
        <p className="cap" style={{ marginTop: 16 }}>
          <Link className="link" href="/forgot">Forgot your password?</Link>
        </p>
      )}
      <p className="body" style={{ marginTop: 8 }}>
        {up ? 'Already have an account? ' : 'New here? '}
        <button className="toggle" type="button" onClick={() => { setMode(up ? 'in' : 'up'); setError(null); setAfter(null) }}>
          {up ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </div>
  )
}
