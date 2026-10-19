'use client'

import * as React from 'react'
import Link from 'next/link'

interface Pick { id: string; title?: string; t?: string; author_name?: string; a?: string; tag?: string }

/** The four picks from the Library. Until the picks table exists (next slice) they live on this phone. */
export function MePicks() {
  const [p, setP] = React.useState<Pick[] | undefined>(undefined)
  const read = () => {
    try {
      setP((JSON.parse(localStorage.getItem('bbb_picks') || '[]') as Pick[]).filter((x) => x && x.id))
    } catch {
      setP([])
    }
  }
  React.useEffect(read, [])
  const remove = (id: string) => {
    try {
      localStorage.setItem('bbb_picks', JSON.stringify((p ?? []).filter((x) => x.id !== id)))
    } catch {}
    read()
  }
  if (p === undefined) return <p className="body">One moment...</p>
  return (
    <>
      <h1 className="h1">Closet Picks</h1>
      <p className="cap" style={{ marginTop: 6 }}>Up to four books: favourites, or ones you want to read. {p.length} of 4 used. They are kept on this phone for now.</p>
      <div className="sp16" />
      {p.map((x) => (
        <div className="er" key={x.id}>
          <span className="tt">{x.title ?? x.t}</span>
          <button className="rm" type="button" aria-label={`Remove ${x.title ?? x.t}`} onClick={() => remove(x.id)}>Remove</button>
          <span className="au">{x.tag ? `${x.tag} · ` : ''}{x.author_name ?? x.a ?? 'Author not recorded'}</span>
        </div>
      ))}
      {p.length === 0 && <p className="body">No picks yet. Open a book in the Library and add it.</p>}
      <p style={{ marginTop: 12 }}><Link className="link" href="/library-room">Open the Library</Link></p>
    </>
  )
}
