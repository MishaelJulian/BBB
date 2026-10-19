'use client'

import * as React from 'react'
import Link from 'next/link'

interface Hit {
  href: string
  label: string
}

const SHORTCUTS: Hit[] = [
  { href: '/meetups', label: 'Meetups' },
  { href: '/members', label: 'Readers' },
  { href: '/library-room', label: 'Library Room' },
  { href: '/club', label: 'About the club' },
]

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const [q, setQ] = React.useState('')
  const [hits, setHits] = React.useState<Hit[] | null>(null)

  React.useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      input.current?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])

  React.useEffect(() => {
    const t = q.trim()
    if (t.length < 2) return void setHits(null)
    const ctl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(t)}`, { signal: ctl.signal })
        if (!r.ok) return void setHits([])
        const j = (await r.json()) as { books: { id: string; title: string; author_name?: string }[]; meetups: { number: number; date: string; venue?: string }[] }
        setHits([
          ...j.meetups.map((m) => ({ href: `/meetups/${m.number}`, label: `Meetup #${m.number}${m.venue ? ` · ${m.venue}` : ''}` })),
          ...j.books.map((b) => ({ href: `/library-room?select=${b.id}`, label: `${b.title}${b.author_name ? ` · ${b.author_name}` : ''}` })),
        ])
      } catch {
        /* aborted */
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      ctl.abort()
    }
  }, [q])

  const list = hits ?? SHORTCUTS
  return (
    <dialog
      id="search"
      ref={ref}
      aria-label="Search"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
    >
      <form method="dialog" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input ref={input} type="search" id="q" placeholder="Search meetups, books, readers" aria-label="Search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="icobtn" aria-label="Close search" style={{ font: '600 24px var(--sans)' }}>
          &times;
        </button>
      </form>
      <ul id="res">
        {list.map((h) => (
          <li key={h.href}>
            <Link href={h.href} onClick={() => ref.current?.close()}>
              {h.label}
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <li className="cap" style={{ padding: '10px 0' }}>
            Nothing matches.
          </li>
        )}
      </ul>
    </dialog>
  )
}
