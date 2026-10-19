// Server-side calls to Supabase Auth. The service-role key stays here (server only, never NEXT_PUBLIC_).
import type { Q } from '../sessionDb'
import type { SetPassword } from './reset'

/** Is this the right password for this email? Asks Supabase Auth (the browser is not trusted to say so). */
export async function passwordOk(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key || !email || !password) return false
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  return !!r && r.ok
}

/** Set a login's password with the Admin API. The password is never logged. */
export const setPasswordAdmin: SetPassword = async (userId, password) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, message: 'Password reset is not available right now. Ask an admin.' }
  const r = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  if (!r) return { ok: false, message: 'The login service is not reachable. Try again in a minute.' }
  if (r.ok) return { ok: true }
  const j = (await r.json().catch(() => null)) as { msg?: string; message?: string } | null
  // A password-policy message is safe to show: the secret has already been proven.
  const m = j?.msg ?? j?.message ?? ''
  return { ok: false, message: r.status === 422 && m ? m : 'Could not set the new password. Try again in a minute.' }
}

/** Belt and braces on top of valid_after: drop the login's Supabase sessions so refresh tokens stop working. Only where the auth schema has them. */
export async function dropSupabaseSessions(db: Q, userId: string): Promise<void> {
  const [r] = await db<{ e: boolean }[]>`select to_regclass('auth.sessions') is not null as e`
  if (r?.e) await db.unsafe('delete from auth.sessions where user_id = $1', [userId])
}
