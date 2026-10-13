import type { TransactionSql } from 'postgres'
import { NextRequest } from 'next/server'
import { sql } from './db'
import { requireAdmin } from './admin'
import { apiError, ok, route } from './http'
import { caller, readJson, type Caller } from './session'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
type Body = Record<string, unknown>

/** An admin-only write: checks the admin, parses the JSON body, runs `fn` in ONE transaction (all or nothing), never cached. */
export function adminRoute<P = Record<string, never>>(
  fn: (tx: TransactionSql, who: Caller, params: P, body: Body) => Promise<unknown>,
  opts: { body?: boolean } = {},
) {
  return route<P>(async (req: NextRequest, { params }) => {
    const g = await requireAdmin(req)
    if ('response' in g) return g.response
    const body = opts.body === false ? {} : await readJson(req)
    if (body === null) return apiError(422, 'A JSON body is required.', NO_STORE)
    const p = await params
    const out = await sql().begin((tx) => fn(tx, g.user, p, body) as Promise<unknown>)
    return ok(out, NO_STORE)
  }, 'write')
}

/** A write by a signed-in member: finds the member record linked to the login (404 if there is none yet), then runs `fn` in one transaction. */
export function memberRoute<P = Record<string, never>>(
  fn: (tx: TransactionSql, who: Caller, memberId: string, params: P, body: Body) => Promise<unknown>,
  opts: { body?: boolean } = {},
) {
  return route<P>(async (req: NextRequest, { params }) => {
    const who = await caller(req)
    if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
    const body = opts.body === false ? {} : await readJson(req)
    if (body === null) return apiError(422, 'A JSON body is required.', NO_STORE)
    const out = await sql().begin(async (tx) => {
      const [m] = await tx<{ id: string }[]>`select id from members where auth_user_id = ${who.id}`
      if (!m) return null
      return fn(tx, who, m.id, await params, body)
    })
    if (out === null) return apiError(404, 'No member record is linked to this login yet.', NO_STORE)
    return ok(out, NO_STORE)
  }, 'write')
}
