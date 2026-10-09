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
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null)

  React.useEffect(() => {
    getSession()
      .then((u) => (u ? setUser(u) : router.replace('/login?next=/account')))
      .catch(() => setStatus({ ok: false, text: 'The login service is not reachable. Try again shortly.' }))
  }, [router])

  const onChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (next.length < 10) return setStatus({ ok: false, text: 'Use at least 10 characters.' })
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
          <Input id="current" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="new" className="block text-sm font-medium text-ink">New password (10+ characters)</label>
          <Input id="new" type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
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
