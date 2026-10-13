import { NextRequest, NextResponse } from 'next/server'
import { sql } from './db'

const ERROR_TYPES: Record<number, string> = { 400: 'validation_error', 404: 'not_found', 422: 'validation_error', 429: 'rate_limited' }

/** The same envelope the FastAPI service used: `detail` for old clients, `error` as the standard (PRD 11.2). */
export function apiError(status: number, message: string, headers?: Record<string, string>) {
  const type = ERROR_TYPES[status] ?? (status >= 500 ? 'server_error' : 'validation_error')
  return NextResponse.json({ detail: message, error: { type, code: type, message } }, { status, headers })
}

/** Edge-cache headers for public reads (same values as set_public_cache in the Python API). */
export function publicCache(maxAge = 60, sMaxAge = 86400, swr = 604800): Record<string, string> {
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
async function limited(req: NextRequest): Promise<boolean> {
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  try {
    const [r] = await sql()<{ ok: boolean }[]>`select hit_rate_limit(${'read:' + ip}, 60, 300) as ok`
    return r ? !r.ok : false
  } catch (e) {
    console.error('rate limiter unavailable', e)
    return false
  }
}

type Ctx<P> = { params: Promise<P> }

/** Wraps a GET handler: rate limit, then run, with one error envelope for anything unexpected. */
export function route<P = Record<string, never>>(handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    if (await limited(req)) return apiError(429, 'Too many requests. Please wait a minute and try again.', { 'Retry-After': '60' })
    try {
      return await handler(req, ctx)
    } catch (e) {
      console.error(`${req.method} ${req.nextUrl.pathname} failed`, e)
      return apiError(500, 'Something went wrong on the server.')
    }
  }
}
