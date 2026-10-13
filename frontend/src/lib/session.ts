import { NextRequest } from 'next/server'

export interface Caller {
  id: string
  email: string
  role: string | null
}

/**
 * Who is calling? Ask Supabase about the bearer token. Roles come from app_metadata only (server-written);
 * user_metadata is user-editable and is never read here.
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
  return { id: u.id, email: u.email ?? '', role: typeof u.app_metadata?.role === 'string' ? u.app_metadata.role : null }
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
