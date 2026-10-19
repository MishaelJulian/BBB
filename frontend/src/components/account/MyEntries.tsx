'use client'

import * as React from 'react'
import { Input } from '@/components/ui/Input'
import { authFetch } from '@/lib/auth'

interface Entry { id: string; meetup_number: number; date: string | null; title: string; author: string | null; notes: string | null }
interface MeetupOption { meetup_number: number; date: string | null; title: string | null }

async function messageOf(res: Response, fallback: string) {
  try {
    const d = await res.json()
    return d?.detail || d?.error?.message || fallback
  } catch {
    return fallback
  }
}

/** The books a linked member brought to meetups: add one, or remove one of their own. Only their own entries are ever touched. */
export function MyEntries() {
  const [data, setData] = React.useState<{ entries: Entry[]; meetups: MeetupOption[] } | null>(null)
  const [meetup, setMeetup] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null)

  const load = React.useCallback(async () => {
    const res = await authFetch('/api/me/entries', { cache: 'no-store' })
    if (res.ok) { const j = await res.json(); if (j.linked !== false) setData(j) }
  }, [])
  React.useEffect(() => { load().catch(() => {}) }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      const res = await authFetch('/api/me/entries', { method: 'POST', body: JSON.stringify({ meetup_number: Number(meetup), title, author: author || undefined, notes: notes || undefined }) })
      if (!res.ok) return setStatus({ ok: false, text: await messageOf(res, 'Could not add that book.') })
      setTitle(''); setAuthor(''); setNotes('')
      setStatus({ ok: true, text: 'Added.' })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this entry?')) return
    const res = await authFetch(`/api/me/entries/${id}`, { method: 'DELETE' })
    setStatus(res.ok ? { ok: true, text: 'Removed.' } : { ok: false, text: await messageOf(res, 'Could not remove it.') })
    if (res.ok) await load()
  }

  if (!data) return null
  return (
    <section aria-labelledby="entries-h" className="space-y-3">
      <h2 id="entries-h" className="font-semibold text-ink">Books you brought</h2>
      {data.entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing recorded under your name yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {data.entries.map((en) => (
            <li key={en.id} className="flex items-start justify-between gap-3 py-2">
              <span className="text-ink">
                <span className="font-mono text-xs text-muted">#{en.meetup_number}</span> {en.title}
                {en.author ? <span className="text-muted"> by {en.author}</span> : null}
              </span>
              <button type="button" onClick={() => remove(en.id)} className="shrink-0 text-xs underline text-red-700 focus:outline-hidden focus:ring-2 focus:ring-accent">Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="space-y-3 border-t border-border pt-3">
        <h3 className="text-sm font-medium text-ink">Add a book</h3>
        <label htmlFor="entry-meetup" className="block text-sm text-ink">Meetup</label>
        <select id="entry-meetup" required value={meetup} onChange={(e) => setMeetup(e.target.value)} className="w-full h-11 rounded-md border border-border bg-white px-2 text-sm text-ink focus:outline-hidden focus:ring-2 focus:ring-accent">
          <option value="">Choose a meetup…</option>
          {data.meetups.map((m) => <option key={m.meetup_number} value={m.meetup_number}>#{m.meetup_number}{m.date ? ` · ${m.date}` : ''}</option>)}
        </select>
        <label htmlFor="entry-title" className="block text-sm text-ink">Title</label>
        <Input id="entry-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="entry-author" className="block text-sm text-ink">Author (optional)</label>
        <Input id="entry-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <label htmlFor="entry-notes" className="block text-sm text-ink">Notes (optional)</label>
        <Input id="entry-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="submit" disabled={busy || !meetup || !title.trim()} className="h-11 px-5 rounded-md bg-amber-800 text-white font-semibold disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-accent focus:ring-offset-2">{busy ? 'Adding…' : 'Add book'}</button>
      </form>
      {status && <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-sm text-green-800' : 'text-sm text-red-700'}>{status.text}</p>}
    </section>
  )
}
