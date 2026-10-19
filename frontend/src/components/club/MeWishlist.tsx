'use client'

import * as React from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth'
import { goodreadsToRead, type WishItem } from '@/lib/member/goodreadsCsv'
import { FloatPair } from './FloatPair'
import { useMe } from './useMe'

interface Item { id: string; title: string; author: string | null }
const EXPORT = 'https://www.goodreads.com/review/import'

const errText = (j: { detail?: string; error?: { message?: string } } | null, d: string) => j?.detail || j?.error?.message || d

/** M1 wishlist: my own list, private unless I switch it, with a Goodreads CSV import (parsed here, previewed, then added). */
export function MeWishlist() {
  const me = useMe()
  const linked = me.state === 'member' || me.state === 'admin'
  const [items, setItems] = React.useState<Item[] | undefined>(undefined)
  const [pub, setPub] = React.useState(false)
  const [pend, setPend] = React.useState<boolean | null>(null)
  const [t, setT] = React.useState('')
  const [a, setA] = React.useState('')
  const [addMsg, setAddMsg] = React.useState('')
  const [imp, setImp] = React.useState<{ items: WishItem[]; msg: string; fresh: number } | null>(null)
  const [impMsg, setImpMsg] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const sa = React.useRef<HTMLDialogElement>(null)
  const si = React.useRef<HTMLDialogElement>(null)
  const sv = React.useRef<HTMLDialogElement>(null)

  const apply = (j: { public: boolean; items: Item[] }) => { setItems(j.items); setPub(j.public) }
  React.useEffect(() => {
    if (!linked) return
    let dead = false
    void authFetch('/api/me/wishlist').then(async (r) => { if (r.ok && !dead) apply(await r.json()) })
    return () => { dead = true }
  }, [linked])

  if (me.state === 'loading') return <p className="body">One moment...</p>
  if (!linked)
    return (
      <>
        <h1 className="h1">Wishlist</h1>
        <p className="body" style={{ marginTop: 12 }}>{me.state === 'out' ? 'Sign in to keep a wishlist.' : 'Link your record from Me first.'}</p>
        <div className="sp24" />
        <Link className="btn" href={me.state === 'out' ? '/login' : '/me'}><span>{me.state === 'out' ? 'Sign in' : 'Go to Me'}</span><span aria-hidden="true">&rsaquo;</span></Link>
      </>
    )

  const add = async () => {
    if (!t.trim()) return setAddMsg('Enter a title.')
    setBusy(true)
    const r = await authFetch('/api/me/wishlist', { method: 'POST', body: JSON.stringify({ title: t, author: a }) })
    const j = await r.json().catch(() => null)
    setBusy(false)
    if (!r.ok) return setAddMsg(errText(j, 'Could not add it.'))
    apply(j); setT(''); setA(''); setAddMsg(''); sa.current?.close()
  }
  const remove = async (id: string) => {
    const r = await authFetch('/api/me/wishlist', { method: 'DELETE', body: JSON.stringify({ id }) })
    if (r.ok) apply(await r.json())
  }
  const setVis = async () => {
    if (pend === null) return
    setBusy(true)
    const r = await authFetch('/api/me/wishlist/visibility', { method: 'PUT', body: JSON.stringify({ public: pend }) })
    setBusy(false)
    if (r.ok) setPub(pend)
    setPend(null); sv.current?.close()
  }
  const pickFile = async (f: File | undefined) => {
    setImp(null)
    if (!f) return setImpMsg('')
    setImpMsg('Reading the file...')
    const res = goodreadsToRead(await f.text())
    if (!res.ok) return setImpMsg(res.error)
    if (!res.items.length) return setImpMsg('No books on the to-read shelf in this file.')
    const r = await authFetch('/api/me/wishlist/import', { method: 'POST', body: JSON.stringify({ items: res.items, dry_run: true }) })
    const j = await r.json().catch(() => null)
    if (!r.ok) return setImpMsg(errText(j, 'Could not check the file.'))
    setImp({ items: res.items, fresh: j.new, msg: '' })
    setImpMsg(j.new ? `${j.new} new ${j.new === 1 ? 'book' : 'books'} on your to-read shelf${j.already ? `, ${j.already} already on your list` : ''}.` : 'Nothing new to import.')
  }
  const doImport = async () => {
    if (!imp) return
    setBusy(true)
    const r = await authFetch('/api/me/wishlist/import', { method: 'POST', body: JSON.stringify({ items: imp.items }) })
    setBusy(false)
    if (!r.ok) return setImpMsg('Could not import. Try again.')
    const w = await authFetch('/api/me/wishlist')
    if (w.ok) apply(await w.json())
    setImp(null); setImpMsg(''); si.current?.close()
  }
  const ask = (v: boolean) => { if (v !== pub) { setPend(v); sv.current?.showModal() } }

  return (
    <>
      <h1 className="h1">Wishlist</h1>
      <div className="vis">
        <span>Who can see it</span>
        <button className="fbtn" type="button" aria-pressed={!pub} style={!pub ? { color: 'var(--accent)' } : undefined} onClick={() => ask(false)}>Only me</button>
        <button className="fbtn" type="button" aria-pressed={pub} style={pub ? { color: 'var(--accent)' } : undefined} onClick={() => ask(true)}>Everyone</button>
      </div>
      <p className="cap" style={{ marginTop: 2 }}>{pub ? 'Public. Anyone can see this list on your profile.' : 'Private. Nobody else can see this list.'}</p>
      <p style={{ margin: '6px 0 0' }}><a className="link" href={EXPORT} target="_blank" rel="noopener noreferrer">How to export from Goodreads</a></p>
      <p className="cap">Desktop browser only. It asks you to sign in to Goodreads first.</p>
      <div className="sp16" />
      {items === undefined ? <p className="body">One moment...</p> : items.length ? (
        items.map((b) => (
          <div className="er" key={b.id}>
            <span className="tt">{b.title}</span>
            <button className="rm" type="button" aria-label={`Remove ${b.title}`} onClick={() => remove(b.id)}>Remove</button>
            <span className="au">{b.author || 'Author not recorded'}</span>
          </div>
        ))
      ) : (
        <p className="body">Nothing here yet. Add a book, or import your Goodreads to-read shelf.</p>
      )}
      <div className="pad" />

      <FloatPair>
        <button className="ghost" type="button" onClick={() => { setImp(null); setImpMsg(''); si.current?.showModal() }}>Import</button>
        <button className="btn" type="button" onClick={() => { setAddMsg(''); sa.current?.showModal() }}><span>+ Add a book</span><span aria-hidden="true">&rsaquo;</span></button>
      </FloatPair>

      <dialog className="sheetx" ref={sa} aria-label="Add a book">
        <p className="h2">Add to wishlist</p>
        <label className="fl" htmlFor="wt">Title</label>
        <input className="fld" id="wt" autoComplete="off" value={t} onChange={(e) => setT(e.target.value)} maxLength={300} />
        <label className="fl" htmlFor="wa">Author</label>
        <input className="fld" id="wa" autoComplete="off" value={a} onChange={(e) => setA(e.target.value)} maxLength={200} />
        <p className="msg" role="status">{addMsg}</p>
        <div className="foot">
          <button className="x" type="button" onClick={() => sa.current?.close()}>Cancel</button>
          <button className="btn" type="button" disabled={busy} onClick={add}><span>Add to wishlist</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </dialog>

      <dialog className="sheetx" ref={si} aria-label="Import from Goodreads">
        <p className="h2">Import from Goodreads</p>
        <ol className="stepsx" style={{ listStyle: "decimal" }}>
          <li>On a desktop browser, open Goodreads, then Import and export.</li>
          <li>Choose Export library and download the CSV.</li>
          <li>Pick that file here.</li>
        </ol>
        <p style={{ margin: '8px 0 0' }}><a className="link" href={EXPORT} target="_blank" rel="noopener noreferrer">How to export from Goodreads</a></p>
        <label className="fl" htmlFor="fi">CSV file</label>
        <input type="file" id="fi" accept=".csv,text/csv" onChange={(e) => void pickFile(e.target.files?.[0])} />
        <p className="msg" role="status">{impMsg}</p>
        <div className="foot">
          <button className="x" type="button" onClick={() => si.current?.close()}>Cancel</button>
          <button className="btn" type="button" disabled={busy || !imp || imp.fresh === 0} style={{ opacity: !imp || imp.fresh === 0 ? 0.45 : 1 }} onClick={doImport}>
            <span>{imp && imp.fresh ? `Import ${imp.fresh} ${imp.fresh === 1 ? 'book' : 'books'}` : 'Import'}</span><span aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      </dialog>

      <dialog className="sheetx" ref={sv} aria-label="Change who can see your wishlist" onClose={() => setPend(null)}>
        <p className="h2">{pend ? 'Make your wishlist public?' : 'Make your wishlist private?'}</p>
        <p className="body" style={{ marginTop: 8 }}>{pend ? 'Anyone who opens your profile will see these books.' : 'Only you will see these books.'}</p>
        <div className="foot">
          <button className="x" type="button" onClick={() => sv.current?.close()}>Cancel</button>
          <button className="btn" type="button" disabled={busy} onClick={setVis}><span>Confirm</span><span aria-hidden="true">&rsaquo;</span></button>
        </div>
      </dialog>
    </>
  )
}
