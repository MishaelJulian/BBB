import { NextRequest, NextResponse } from 'next/server'
import { sql } from './db'
import { SESSION_EXPIRED_MESSAGE } from './sessionPolicy'

const ERROR_TYPES: Record<number, string> = { 400: 'validation_error', 401: 'auth_error', 403: 'permission_error', 404: 'not_found', 422: 'validation_error', 429: 'rate_limited' }

/** The same envelope the FastAPI service used: `detail` for old clients, `error` as the standard (PRD 11.2). */
export function apiError(status: number, message: string, headers?: Record<string, string>) {
  const type = ERROR_TYPES[status] ?? (status >= 500 ? 'server_error' : 'validation_error')
  const code = status === 401 && message === SESSION_EXPIRED_MESSAGE ? 'session_expired' : type // the browser signs out on this one
  return NextResponse.json({ detail: message, error: { type, code, message } }, { status, headers: status === 401 ? { 'Cache-Control': 'private, no-store', ...headers } : headers })
}

/** Edge-cache headers for public reads. 60 s at the CDN: writes are live, so a day-long cache would hide edits (nothing purges it). */
export function publicCache(maxAge = 60, sMaxAge = 60, swr = 600): Record<string, string> {
  const cdn = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    'CDN-Cache-Control': cdn,
    'Vercel-CDN-Cache-Control': cdn,
  }
}

export const ok = (data: unknown, headers?: Record<string, string>) => NextResponse.json(data, { headers })

/** FastAPI-style boolean query parameter. */
export const flag = (v: string | null) => v !== null && ['true', '1', 'yes', 'on'].includes(v.toLowerCase())

// ponytail: fixed window, 300 reads/min per visitor, counted in Postgres (hit_rate_limit). Fails open: a limiter outage must not take the site down.
type Kind = 'read' | 'write'
const LIMITS: Record<Kind, number> = { read: 300, write: 30 } // per visitor per minute

async function limited(req: NextRequest, kind: Kind): Promise<boolean> {
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  try {
    const [r] = await sql()<{ ok: boolean }[]>`select hit_rate_limit(${kind + ':' + ip}, 60, ${LIMITS[kind]}) as ok`
    return r ? !r.ok : false
  } catch (e) {
    console.error('rate limiter unavailable', e)
    return false
  }
}

/** Throw from inside a handler or operation to answer with a specific status and message. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

type Ctx<P> = { params: Promise<P> }

/** Postgres statement timeout (57014) or a dropped pooler connection: worth one retry on a read. */
const transientDb = (e: unknown) => {
  const x = e as { code?: string; message?: string } | null
  return x?.code === '57014' || /CONNECT_TIMEOUT|CONNECTION_(CLOSED|ENDED|DESTROYED)|ECONNRESET/.test(`${x?.code ?? ''} ${x?.message ?? ''}`)
}

/** Wraps a handler: rate limit (reads 300/min, writes 30/min per visitor), then run, with one error envelope for anything unexpected. */
export function route<P = Record<string, never>>(handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>, kind: Kind = 'read') {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    if (await limited(req, kind)) return apiError(429, 'Too many requests. Please wait a minute and try again.', { 'Retry-After': '60' })
    try {
      try {
        return await handler(req, ctx)
      } catch (e) {
        // One retry for reads only (a write may or may not have committed): the pooler can drop or instantly time out a fresh connection.
        if (kind !== 'read' || !transientDb(e)) throw e
        await new Promise((r) => setTimeout(r, 150))
        return await handler(req, ctx)
      }
    } catch (e) {
      if (e instanceof HttpError) return apiError(e.status, e.message, { 'Cache-Control': 'private, no-store' })
      console.error(`${req.method} ${req.nextUrl.pathname} failed`, e)
      return apiError(500, 'Something went wrong on the server.')
    }
  }
}
