'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { oauthProviders, signIn, signInWithProvider, signUp } from '@/lib/auth'
import { Turnstile, type TurnstileHandle } from '@/components/auth/Turnstile'

function Eye({ off }: { off: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  )
}

function LoginForm() {
  const params = useSearchParams()
  const next = params.get('next')
  // Only same-site paths, so a crafted ?next= cannot send people elsewhere.
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'
  const [mode, setMode] = React.useState<'in' | 'up'>('in')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [token, setToken] = React.useState<string | null>(null)
  const captcha = React.useRef<TurnstileHandle>(null)
  const signingUp = mode === 'up'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (signingUp) {
        const signedIn = await signUp(email.trim(), password, token ?? undefined)
        if (!signedIn) {
          setNotice('Account created. Check your email to confirm it, then sign in.')
          setMode('in')
          return
        }
      } else {
        await signIn(email.trim(), password, token ?? undefined)
      }
      window.location.href = target
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      captcha.current?.reset() // a bot-check token works once
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5" aria-describedby={error ? 'login-error' : undefined}>
        <h1 className="font-display text-2xl text-ink">{signingUp ? 'Create an account' : 'Sign in'}</h1>
        <p className="text-sm text-muted">
          {signingUp ? 'Try the BBB library demo with your own account.' : 'Welcome back to the BBB library demo.'}
        </p>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-ink">Email</label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-ink">Password{signingUp ? ' (8+ characters)' : ''}</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              required
              minLength={signingUp ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink focus:outline-none focus:text-ink p-1 rounded"
            >
              <Eye off={showPassword} />
            </button>
          </div>
        </div>
        <Turnstile ref={captcha} onToken={setToken} />
        {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
        {error && <p id="login-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full h-11 rounded-md bg-amber-800 text-white font-semibold disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
          {busy ? (signingUp ? 'Creating…' : 'Signing in…') : signingUp ? 'Create account' : 'Sign in'}
        </button>
        {oauthProviders.length > 0 && (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted">or</p>
            {oauthProviders.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => signInWithProvider(p).catch((err) => setError(err instanceof Error ? err.message : 'Could not start sign-in.'))}
                className="w-full h-11 rounded-md border border-border text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Continue with {p === 'google' ? 'Google' : 'Apple'}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted">
          {signingUp ? 'Already have an account? ' : 'New here? '}
          <button type="button" onClick={() => { setMode(signingUp ? 'in' : 'up'); setError(null); setNotice(null) }} className="underline text-ink">
            {signingUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  )
}
