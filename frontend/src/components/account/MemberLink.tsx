'use client'

import * as React from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { authFetch } from '@/lib/auth'
import { MyEntries } from './MyEntries'

interface Member { id: string; display_name: string; bio: string | null }

async function messageOf(res: Response, fallback: string) {
  try {
    const d = await res.json()
    return d?.detail || d?.error?.message || fallback
  } catch {
    return fallback
  }
}

/** Claim your member record with an invite code, then edit your own bio. */
export function MemberLink() {
  const [member, setMember] = React.useState<Member | null | undefined>(undefined)
  const [code, setCode] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null)

  React.useEffect(() => {
    authFetch('/api/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const d = await res.json()
        setMember(d.member)
        setBio(d.member?.bio ?? '')
      })
      .catch(() => setMember(null))
  }, [])

  const claim = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const res = await authFetch('/api/me/claim', { method: 'POST', body: JSON.stringify({ code }) })
      if (!res.ok) return setStatus({ ok: false, text: await messageOf(res, 'Could not use that code.') })
      const d = await res.json()
      setMember(d.member)
      setBio(d.member.bio ?? '')
      setCode('')
      setStatus({ ok: true, text: `Linked. You are now ${d.member.display_name}.` })
    } finally {
      setBusy(false)
    }
  }

  const saveBio = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const res = await authFetch('/api/me/profile', { method: 'PUT', body: JSON.stringify({ bio }) })
      setStatus(res.ok ? { ok: true, text: 'Bio saved.' } : { ok: false, text: await messageOf(res, 'Could not save the bio.') })
    } finally {
      setBusy(false)
    }
  }

  if (member === undefined) return <p className="text-sm text-muted" aria-busy="true">Loading your member record…</p>

  return (
    <section aria-labelledby="member-link-h" className="space-y-3">
      <h2 id="member-link-h" className="font-semibold text-ink">Your member record</h2>
      {member ? (
        <form onSubmit={saveBio} className="space-y-3">
          <p className="text-sm text-muted">
            You are <Link href={`/members/${member.id}`} className="underline text-ink">{member.display_name}</Link> in the archive.
          </p>
          <label htmlFor="bio" className="block text-sm font-medium text-ink">About you (shown on your member page)</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} rows={4} className="w-full rounded-md border border-border bg-white p-2 text-sm text-ink focus:outline-hidden focus:ring-2 focus:ring-accent" />
          <button type="submit" disabled={busy} className="h-11 px-5 rounded-md bg-amber-800 text-white font-semibold disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-accent focus:ring-offset-2">{busy ? 'Saving…' : 'Save bio'}</button>
        </form>
      ) : (
        <form onSubmit={claim} className="space-y-3">
          <p className="text-sm text-muted">Got an invite code from the club? Enter it to link this account to your member record.</p>
          <label htmlFor="invite-code" className="block text-sm font-medium text-ink">Invite code</label>
          <Input id="invite-code" autoComplete="off" autoCapitalize="characters" placeholder="XXXXX-XXXXX" required value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit" disabled={busy || !code.trim()} className="h-11 px-5 rounded-md bg-amber-800 text-white font-semibold disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-accent focus:ring-offset-2">{busy ? 'Checking…' : 'Link my record'}</button>
        </form>
      )}
      {status && <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-sm text-green-800' : 'text-sm text-red-700'}>{status.text}</p>}
      {member && <MyEntries />}
    </section>
  )
}
