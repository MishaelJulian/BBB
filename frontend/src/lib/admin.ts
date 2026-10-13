import { NextRequest } from 'next/server'

export type AdminCheck = { status: 'ok' } | { status: 'unauthenticated' } | { status: 'forbidden' }

/**
 * Server-side admin check: ask Supabase who owns the bearer token, then require app_metadata.role = 'admin'.
 * app_metadata can only be written server-side; user_metadata is user-editable and is never read here.
 * ponytail: one extra round trip to Supabase per admin request; verify the JWT locally against the JWKS if that ever matters.
 */
export async function checkAdmin(req: NextRequest): Promise<AdminCheck> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!token || !url || !key) return { status: 'unauthenticated' }
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!r || !r.ok) return { status: 'unauthenticated' }
  const u = (await r.json().catch(() => null)) as { app_metadata?: { role?: unknown } } | null
  return u?.app_metadata?.role === 'admin' ? { status: 'ok' } : { status: 'forbidden' }
}
