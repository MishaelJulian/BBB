'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { signIn } from '@/lib/auth'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')
  // Only same-site paths, so a crafted ?next= cannot send people elsewhere.
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin'
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      router.replace(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5" aria-describedby={error ? 'login-error' : undefined}>
        <h1 className="font-display text-2xl text-ink">Sign in</h1>
        <p className="text-sm text-muted">For BBB presenters and admins. Accounts are created by a founder.</p>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-ink">Email</label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-ink">Password</label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-red-700">{error}</p>
        )}
        <button type="submit" disabled={busy} className="w-full h-11 rounded-md bg-amber-800 text-white font-semibold disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-muted">Forgot your password? Ask a founder to reset it.</p>
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
