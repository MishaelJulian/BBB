'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { changePassword, getSession, signOut, type SessionUser } from '@/lib/auth'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = React.useState<SessionUser | null | undefined>(undefined)
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNext, setShowNext] = React.useState(false)
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null)

  React.useEffect(() => {
    getSession()
      .then((u) => (u ? setUser(u) : router.replace('/login?next=/account')))
      .catch(() => setStatus({ ok: false, text: 'The login service is not reachable. Try again shortly.' }))
  }, [router])

  const onChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (next.length < 8) return setStatus({ ok: false, text: 'Use at least 8 characters.' })
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setStatus({ ok: true, text: 'Password changed. Other devices were signed out.' })
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : 'Could not change the password.' })
    }
  }

  if (user === undefined) {
    return <main className="px-4 py-12 text-center text-muted" aria-busy="true">{status?.text ?? 'Loading…'}</main>
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12 space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Your account</h1>
        <p className="text-sm text-muted">{user?.email} · {user?.role ?? 'presenter'}</p>
      </div>
      <form onSubmit={onChange} className="space-y-4">
        <h2 className="font-semibold text-ink">Change password</h2>
        <div className="space-y-1.5">
          <label htmlFor="current" className="block text-sm font-medium text-ink">Current password</label>
          <div className="relative">
            <Input
              id="current"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((prev) => !prev)}
              aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink focus:outline-none focus:text-ink p-1 rounded"
            >
              {showCurrent ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new" className="block text-sm font-medium text-ink">New password (8+ characters)</label>
          <div className="relative">
            <Input
              id="new"
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNext((prev) => !prev)}
              aria-label={showNext ? 'Hide new password' : 'Show new password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink focus:outline-none focus:text-ink p-1 rounded"
            >
              {showNext ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {status && <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-sm text-green-800' : 'text-sm text-red-700'}>{status.text}</p>}
        <button type="submit" className="h-11 px-5 rounded-md bg-amber-800 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">Change password</button>
      </form>
      <button
        type="button"
        onClick={async () => { await signOut(); router.replace('/') }}
        className="h-11 px-5 rounded-md border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Sign out
      </button>
    </main>
  )
}
