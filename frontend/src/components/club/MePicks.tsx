'use client'

import * as React from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth'
import { useMe } from './useMe'

interface Pick { book_id: string; title: string; author_name: string | null; tag: string }

/** My Closet Picks: up to four books, kept in the database and shared with the club (counts only; admins see names). */
export function MePicks() {
  const me = useMe()
  const [p, setP] = React.useState<Pick[] | undefined>(undefined)
  const [msg, setMsg] = React.useState('')
  const linked = me.state === 'member' || me.state === 'admin'
  React.useEffect(() => {
    if (!linked) return
    let dead = false
    void authFetch('/api/me/picks').then(async (r) => {
      if (dead) return
      if (r.ok) setP((await r.json()).picks)
      else setP([])
    })
    return () => { dead = true }
  }, [linked])
  const remove = async (id: string) => {
    setMsg('')
    const r = await authFetch('/api/me/picks', { method: 'DELETE', body: JSON.stringify({ book_id: id }) })
    const j = await r.json().catch(() => null)
    if (r.ok) setP(j.picks)
    else setMsg(j?.detail || 'Could not remove it.')
  }
  if (me.state === 'loading') return <p className="body">One moment...</p>
  if (me.state === 'out')
    return (
      <>
        <h1 className="h1">Closet Picks</h1>
        <p className="body" style={{ marginTop: 12 }}>Sign in to see your picks.</p>
        <div className="sp24" />
        <Link className="btn" href="/login"><span>Sign in</span><span aria-hidden="true">&rsaquo;</span></Link>
      </>
    )
  if (me.state === 'new')
    return (
      <>
        <h1 className="h1">Closet Picks</h1>
        <p className="body" style={{ marginTop: 12 }}>Link your record from Me first.</p>
      </>
    )
  if (p === undefined) return <p className="body">One moment...</p>
  return (
    <>
      <h1 className="h1">Closet Picks</h1>
      <p className="cap" style={{ marginTop: 6 }}>Up to four books: favourites, or ones you want to read. {p.length} of 4 used. Other members see only how many people picked a book, never who.</p>
      <div className="sp16" />
      {p.map((x) => (
        <div className="er" key={x.book_id}>
          <Link className="tt" href={`/books/${x.book_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{x.title}</Link>
          <button className="rm" type="button" aria-label={`Remove ${x.title}`} onClick={() => remove(x.book_id)}>Remove</button>
          <span className="au">{x.tag} &middot; {x.author_name ?? 'Author not recorded'}</span>
        </div>
      ))}
      {msg && <p className="msg2 bad" role="alert">{msg}</p>}
      {p.length === 0 && <p className="body">No picks yet. Open a book in the Library and add it.</p>}
      <p style={{ marginTop: 12 }}><Link className="link" href="/library-room">Open the Library</Link></p>
    </>
  )
}
