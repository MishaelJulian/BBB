'use client'

import * as React from 'react'
import { FloatPair } from './FloatPair'
import { authFetch } from '@/lib/auth'

interface Entry { id: string; meetup_number: number; date: string | null; title: string; author: string | null; notes: string | null }
interface MeetupOption { meetup_number: number; date: string | null; title: string | null }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dt = (d: string) => {
  const t = new Date(d.slice(0, 10) + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
async function problem(res: Response, fallback: string) {
  try {
    const d = await res.json()
    return d?.detail || d?.error?.message || fallback
  } catch {
    return fallback
  }
}

/** Books the member brought: add one, or remove one of their own (the server only ever touches their own entries). */
export function MeEntries() {
  const [data, setData] = React.useState<{ entries: Entry[]; meetups: MeetupOption[] } | null | undefined>(undefined)
  const [meetup, setMeetup] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [undo, setUndo] = React.useState<Entry | null>(null)
  const sheet = React.useRef<HTMLDialogElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = React.useCallback(async () => {
    const r = await authFetch('/api/me/entries', { cache: 'no-store' })
    setData(r.ok ? await r.json() : null)
  }, [])
  React.useEffect(() => { void load() }, [load])

  const add = async () => {
    if (!meetup || !title.trim()) return setMsg('Choose a meetup and enter a title.')
    setBusy(true)
    setMsg('')
    const r = await authFetch('/api/me/entries', { method: 'POST', body: JSON.stringify({ meetup_number: Number(meetup), title: title.trim(), author: author.trim() || undefined }) })
    setBusy(false)
    if (!r.ok) return setMsg(await problem(r, 'Could not add that book.'))
    setTitle('')
    setAuthor('')
    sheet.current?.close()
    await load()
  }
  const remove = async (e: Entry) => {
    const r = await authFetch(`/api/me/entries/${e.id}`, { method: 'DELETE' })
    if (!r.ok) return setMsg(await problem(r, 'Could not remove it.'))
    await load()
    setUndo(e)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setUndo(null), 7000)
  }
  const restore = async (e: Entry) => {
    setUndo(null)
    await authFetch('/api/me/entries', { method: 'POST', body: JSON.stringify({ meetup_number: e.meetup_number, title: e.title, author: e.author || undefined }) })
    await load()
  }

  if (data === undefined) return <p className="body">One moment...</p>
  if (data === null)
    return (
      <>
        <h1 className="h1">Entries</h1>
        <p className="body" style={{ marginTop: 12 }}>Link your member record first, then your entries show here.</p>
      </>
    )
  return (
    <>
      <h1 className="h1">Entries</h1>
      <p className="cap" style={{ marginTop: 6 }}>{data.entries.length} books you brought to meetups</p>
      <div className="sp16" />
      {data.entries.map((e) => (
        <div className="er" key={e.id}>
          <span className="tt">{e.title}</span>
          <button className="rm" type="button" aria-label={`Remove ${e.title}`} onClick={() => remove(e)}>Remove</button>
          <span className="au">{e.author || 'Author not recorded'} &middot; #{e.meetup_number}{e.date ? ` · ${dt(e.date)}` : ''}</span>
        </div>
      ))}
      {data.entries.length === 0 && <p className="body">No entries yet.</p>}
      {msg && !sheet.current?.open && <p className="notice err" role="alert">{msg}</p>}
      <FloatPair>
        <button className="btn" type="button" onClick={() => { setMsg(''); sheet.current?.showModal() }}><span>+ Add a book</span><span aria-hidden="true">&rsaquo;</span></button>
      </FloatPair>
      {undo && (
        <div className="undo" role="status">
          <span>Entry removed.</span>
          <button type="button" onClick={() => restore(undo)}>Undo</button>
        </div>
      )}
      <dialog className="sheetx" ref={sheet} aria-label="Add a book" onClick={(e) => e.target === sheet.current && sheet.current?.close()}>
        <p className="h2">Add a book</p>
        <label className="fl" htmlFor="em">Meetup</label>
        <select className="fld" id="em" value={meetup} onChange={(e) => setMeetup(e.target.value)}>
          <option value="">Choose a meetup</option>
          {data.meetups.map((m) => <option key={m.meetup_number} value={m.meetup_number}>#{m.meetup_number}{m.date ? ` · ${dt(m.date)}` : ''}</option>)}
        </select>
        <label className="fl" htmlFor="et">Title</label>
        <input className="fld" id="et" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="fl" htmlFor="ea">Author</label>
        <input className="fld" id="ea" autoComplete="off" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <p className="msg" role="status">{msg}</p>
        <div className="foot">
          <button className="x" type="button" onClick={() => sheet.current?.close()}>Cancel</button>
          <button className="btn" type="button" disabled={busy} onClick={add}><span>{busy ? 'Adding...' : 'Add entry'}</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </dialog>
    </>
  )
}
