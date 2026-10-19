import { NextRequest } from 'next/server'
import type { TransactionSql } from 'postgres'
import { requireAdmin } from '../admin'
import { ok, route } from '../http'
import { sql } from '../db'
import type { Caller } from '../session'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** An admin-only read: checks the admin on the server, never cached. Rate limited as a read (300/min). */
export function adminGet<P = Record<string, never>>(fn: (req: NextRequest, who: Caller, params: P) => Promise<unknown>) {
  return route<P>(async (req, { params }) => {
    const g = await requireAdmin(req)
    if ('response' in g) return g.response
    return ok(await fn(req, g.user, await params), NO_STORE)
  }, 'read')
}

/** An admin-only write whose body is not JSON (a photo): same admin check, the 30/min write limit and one transaction. */
export function adminRawWrite<P = Record<string, never>>(fn: (tx: TransactionSql, who: Caller, params: P, req: NextRequest) => Promise<unknown>) {
  return route<P>(async (req, { params }) => {
    const g = await requireAdmin(req)
    if ('response' in g) return g.response
    const p = await params
    return ok(await sql().begin((tx) => fn(tx, g.user, p, req) as Promise<unknown>), NO_STORE)
  }, 'write')
}

/** An admin-only action that is not one transaction (it calls other sites first, or only clears caches): admin check, JSON body, 30/min write limit. */
export function adminAction<P = Record<string, never>>(fn: (req: NextRequest, who: Caller, params: P, body: Record<string, unknown>) => Promise<unknown>) {
  return route<P>(async (req, { params }) => {
    const g = await requireAdmin(req)
    if ('response' in g) return g.response
    const text = await req.text().catch(() => '')
    let body: Record<string, unknown> = {}
    if (text) {
      try {
        const v = JSON.parse(text)
        if (v && typeof v === 'object' && !Array.isArray(v)) body = v as Record<string, unknown>
      } catch { /* an empty or invalid body is treated as no body */ }
    }
    return ok(await fn(req, g.user, await params, body), NO_STORE)
  }, 'write')
}
