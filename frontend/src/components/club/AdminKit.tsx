'use client'

import * as React from 'react'
import Link from 'next/link'
import '@/styles/club-admin.css'
import { authFetch } from '@/lib/auth'
import { ClubPage, type Crumb } from './ClubPage'
import { useMe } from './useMe'

/** The page every admin tool sits in. The client only decides what to SHOW; each /api/admin route checks the admin again on the server. */
export function AdminPage({ crumbs, children }: { crumbs: Crumb[]; children: React.ReactNode }) {
  const me = useMe()
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/', label: 'Home' }, ...crumbs]} tab="">
      <div className="adm">
        <div className="sp24" />
        {me.state === 'loading' ? (
          <p className="body">One moment...</p>
        ) : me.state !== 'admin' ? (
          <div className="gate">
            <h1 className="h1">Admin</h1>
            <p className="body" style={{ marginTop: 12 }}>{me.state === 'out' ? 'Sign in with an admin account to continue.' : 'This area is for admins only.'}</p>
            <div className="sp24" />
            <Link className="btn" href={me.state === 'out' ? '/login' : '/'}><span>{me.state === 'out' ? 'Sign in' : 'Go to Home'}</span><span aria-hidden="true">&rsaquo;</span></Link>
          </div>
        ) : (
          children
        )}
        <div className="sp48" />
      </div>
    </ClubPage>
  )
}

/** Calls an admin route with the signed-in token; throws the server's own message on failure. */
export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  const r = await authFetch(path, { ...rest, body: json !== undefined ? JSON.stringify(json) : rest.body, method: rest.method ?? (json !== undefined ? 'POST' : 'GET') })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw new Error(j?.detail || j?.error?.message || 'Something went wrong. Try again.')
  return j as T
}

/** GET data for a page, with reload. */
export function useApi<T>(path: string | null) {
  const [data, setData] = React.useState<T | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => {
    if (!path) return
    let live = true
    setError(null)
    api<T>(path).then((d) => live && setData(d)).catch((e: Error) => live && setError(e.message))
    return () => { live = false }
  }, [path, tick])
  return { data, error, reload: () => setTick((t) => t + 1), setData }
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function fmt(d: string | null | undefined): string {
  if (!d) return ''
  const t = new Date(d.length === 10 ? `${d}T00:00:00` : d)
  return Number.isNaN(t.getTime()) ? '' : `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}
export const fmtTime = (d: string) => { const t = new Date(d); return `${fmt(d)}, ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` }

export function Back({ href, label }: { href: string; label: string }) {
  return <Link className="back" href={href}><span aria-hidden="true">&lsaquo;</span>{label}</Link>
}

export function Rowl({ href, t1, t2, onClick, id }: { href?: string; t1: string; t2?: string; onClick?: (e: React.MouseEvent) => void; id?: string }) {
  const inner = (
    <>
      <span><span className="t1">{t1}</span>{t2 && <span className="t2">{t2}</span>}</span>
      <span className="go" aria-hidden="true">&rsaquo;</span>
    </>
  )
  return href ? <Link className="rowl" id={id} href={href} onClick={onClick}>{inner}</Link> : <a className="rowl" id={id} href="#" onClick={(e) => { e.preventDefault(); onClick?.(e) }}>{inner}</a>
}

export function Act({ t, sub, onClick, danger, off }: { t: string; sub?: string; onClick?: () => void; danger?: boolean; off?: boolean }) {
  return (
    <button className={`act${danger ? ' dg' : ''}`} type="button" aria-disabled={off || undefined} onClick={off ? undefined : onClick}>
      <span>{t}{sub && <small>{sub}</small>}</span>
      {!off && <span className="go" aria-hidden="true">&rsaquo;</span>}
    </button>
  )
}

export function Msg({ m }: { m: { ok: boolean; t: string } | null }) {
  return m ? <p className={`amsg${m.ok ? '' : ' bad'}`} role={m.ok ? 'status' : 'alert'}>{m.t}</p> : null
}

/** A bottom sheet on the native <dialog> (focus trap and Escape come with it). */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDialogElement>(null)
  React.useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="sheetx asheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }}>
      {open && children}
    </dialog>
  )
}

/** The small black bar with an optional Undo, from the public sheet (.undo). */
export function useToast() {
  const [t, setT] = React.useState<{ text: string; undo?: () => void } | null>(null)
  React.useEffect(() => {
    if (!t) return
    const id = setTimeout(() => setT(null), 8000)
    return () => clearTimeout(id)
  }, [t])
  const node = t ? (
    <div className="undo" role="status">
      <span>{t.text}</span>
      {t.undo && <button type="button" onClick={() => { t.undo?.(); setT(null) }}>Undo</button>}
    </div>
  ) : null
  return { node, show: (text: string, undo?: () => void) => setT({ text, undo }) }
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const E = (s: unknown) => String(s ?? '')
