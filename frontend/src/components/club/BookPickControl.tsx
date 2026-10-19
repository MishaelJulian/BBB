'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth'
import { FloatPair } from './FloatPair'
import { useMe } from './useMe'

interface Pick { book_id: string; title: string; tag: string }
const TAGS = ['Favourite', 'Want to read']

/** The book page's pick controls: my tag with Remove, "N others also picked this" (a count; admins also see names), and the Add to my picks sheet. */
export function BookPickControl({ bookId, title }: { bookId: string; title: string }) {
  const me = useMe()
  const router = useRouter()
  const linked = me.state === 'member' || me.state === 'admin'
  const [picks, setPicks] = React.useState<Pick[] | null>(null)
  const [others, setOthers] = React.useState<number | null>(null)
  const [readers, setReaders] = React.useState<{ id: string; display_name: string; tag: string }[] | null>(null)
  const [tag, setTag] = React.useState(TAGS[0])
  const [replace, setReplace] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const sheet = React.useRef<HTMLDialogElement>(null)

  const load = React.useCallback(async () => {
    const [a, b] = await Promise.all([authFetch('/api/me/picks'), authFetch(`/api/me/picks?book=${encodeURIComponent(bookId)}`)])
    if (a.ok) setPicks((await a.json()).picks)
    if (b.ok) {
      const j = await b.json()
      setOthers(j.others)
      setReaders(j.readers ?? null)
    }
  }, [bookId])
  React.useEffect(() => {
    if (linked) void load().catch(() => {})
  }, [linked, load])

  const mine = picks?.find((p) => p.book_id === bookId)
  const full = (picks?.length ?? 0) >= 4 && !mine
  const send = async (method: 'POST' | 'DELETE', body: Record<string, unknown>) => {
    setBusy(true)
    setMsg('')
    const r = await authFetch('/api/me/picks', { method, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null)
    setBusy(false)
    if (!r.ok) return setMsg(j?.detail || j?.error?.message || 'Could not save your picks.')
    await load()
    sheet.current?.close()
  }
  const open = () => {
    if (me.state === 'out') return router.push('/login')
    if (me.state === 'new') return router.push('/me')
    setTag(TAGS[0])
    setReplace(picks?.[0]?.book_id ?? '')
    setMsg('')
    sheet.current?.showModal()
  }

  return (
    <>
      {mine && (
        <p className="body" style={{ marginTop: 6 }}>
          In your picks: {mine.tag}. <button className="rd" type="button" disabled={busy} onClick={() => void send('DELETE', { book_id: bookId })}>Remove</button>
        </p>
      )}
      {linked && others !== null && (
        <p className="cap" style={{ marginTop: 6 }} data-testid="picked-by">
          {others === 0 ? 'No one else has picked this yet.' : `${others} ${others === 1 ? 'other has' : 'others have'} also picked this.`}
          {readers && readers.length > 0 && <span style={{ display: 'block' }}>Picked by: {readers.map((x) => `${x.display_name} (${x.tag})`).join(', ')}</span>}
        </p>
      )}
      {msg && !sheet.current?.open && <p className="msg2 bad" role="alert">{msg}</p>}
      <FloatPair>
        <button className="btn" type="button" onClick={open}><span>{mine ? 'In your picks' : 'Add to my picks'}</span><span aria-hidden="true">&rsaquo;</span></button>
      </FloatPair>
      <dialog className="sheetx" ref={sheet} aria-labelledby="bpt" onClick={(e) => e.target === sheet.current && sheet.current?.close()}>
        <p className="h2" id="bpt">{full ? 'You have four picks' : mine ? 'Change your pick' : 'Add to my picks'}</p>
        <p className="body" style={{ marginTop: 4 }}>{title}</p>
        {full && (
          <fieldset className="tagset">
            <legend className="cap">Picks are limited to four. Replace which one?</legend>
            {(picks ?? []).map((p) => (
              <label className="opt" key={p.book_id}><input type="radio" name="rp" checked={replace === p.book_id} onChange={() => setReplace(p.book_id)} /> {p.title}</label>
            ))}
          </fieldset>
        )}
        <fieldset className="tagset">
          <legend className="cap">Why?</legend>
          {TAGS.map((t) => (
            <label className="opt" key={t}><input type="radio" name="pt" checked={tag === t} onChange={() => setTag(t)} /> {t}</label>
          ))}
        </fieldset>
        <p className="msg" role="alert">{msg}</p>
        <div className="foot">
          <button className="x" type="button" onClick={() => sheet.current?.close()}>Cancel</button>
          <button className="btn" type="button" disabled={busy} onClick={() => void send('POST', { book_id: bookId, tag, ...(full ? { replace_book_id: replace } : {}) })}>
            <span>{full ? 'Replace pick' : 'Save pick'}</span><span aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      </dialog>
      {me.state === 'out' && <p className="cap" style={{ marginTop: 6 }}><Link className="link" href="/login">Sign in</Link> to add this to your picks.</p>}
    </>
  )
}
