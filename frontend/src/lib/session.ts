import { NextRequest } from 'next/server'
import { sql } from './db'
import { HttpError } from './http'
import { evaluateSession } from './sessionDb'
import { jwtFacts, SESSION_EXPIRED_MESSAGE } from './sessionPolicy'

export interface Caller {
  id: string
  email: string
  role: string | null
  /** Supabase session id and the time it really began (Unix seconds), when the token carries them. */
  sessionId?: string | null
  sessionStart?: number | null
}

/** Best effort: end one Supabase session whose allowance is over, so its refresh token stops minting tokens. */
function revokeAtSupabase(url: string, key: string, token: string) {
  void fetch(`${url}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {})
}

/**
 * Who is calling? Ask Supabase about the bearer token. Roles come from app_metadata only (server-written);
 * user_metadata is user-editable and is never read here.
 * Then the session length rules (24 h admin, 30 d member, 90 d with "Keep me signed in", from SIGN-IN time) are applied here, in our code:
 * an over-age session throws a 401 with code session_expired, which the browser answers by signing out.
 * ponytail: one round trip to Supabase per request; verify the JWT locally against the JWKS if that ever matters.
 */
export async function caller(req: NextRequest): Promise<Caller | null> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!token || !url || !key) return null
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!r || !r.ok) return null
  const u = (await r.json().catch(() => null)) as { id?: string; email?: string; app_metadata?: { role?: unknown } } | null
  if (!u?.id) return null
  const role = typeof u.app_metadata?.role === 'string' ? u.app_metadata.role : null
  const facts = jwtFacts(token)
  const v = await evaluateSession(sql(), { userId: u.id, role, facts, now: Math.floor(Date.now() / 1000) })
  if (v.status !== 'ok') {
    if (v.status === 'expired') revokeAtSupabase(url, key, token)
    throw new HttpError(401, SESSION_EXPIRED_MESSAGE)
  }
  return { id: u.id, email: u.email ?? '', role, sessionId: facts.sessionId, sessionStart: v.start }
}

/** A JSON request body, or null if it is missing, invalid or larger than 64 KB. */
export async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  const text = await req.text().catch(() => '')
  if (!text || text.length > 65536) return null
  try {
    const v = JSON.parse(text)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}
