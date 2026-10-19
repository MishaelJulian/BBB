import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { audit } from '@/lib/audit'
import { apiError, ok, route } from '@/lib/http'
import { caller, readJson } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const REASONS = ['I do not use it', 'I have another account', 'I am worried about my privacy', 'I am leaving the club', 'Something else']

/** Is this the right password for this email? Asks Supabase Auth (the browser is not trusted to say so). */
async function passwordOk(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return false
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  return !!r && r.ok
}

/**
 * Delete my account (the founder's option A): unlink the login and erase my bio, wishlist and picks.
 * The club's attendance and discussion history stay under my name (an admin can anonymise it on request).
 * Needs the password again, checked here. Then the login itself is removed from Supabase Auth.
 * { password, reason? }
 */
export const POST = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const body = await readJson(req)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!password) return apiError(422, 'Enter your password.', NO_STORE)
  if (who.role === 'admin') return apiError(403, 'An admin account cannot be deleted here. Ask the club to remove the admin role first.', NO_STORE)
  const reason = typeof body?.reason === 'string' && REASONS.includes(body.reason) ? body.reason : null

  const [lim] = await sql()<{ ok: boolean }[]>`select hit_rate_limit(${'delacct:' + who.id}, 600, 5) as ok`
  if (lim && !lim.ok) return apiError(429, 'Too many tries. Wait a few minutes and try again.', { 'Retry-After': '600', ...NO_STORE })
  if (!who.email || !(await passwordOk(who.email, password))) return apiError(403, 'That password is not right.', NO_STORE)

  await sql().begin(async (tx) => {
    const [m] = await tx<{ id: string; bio: string | null; wishlist_public: boolean }[]>`
      select id, bio, wishlist_public from members where auth_user_id = ${who.id} for update`
    if (m) {
      const [w] = await tx<{ n: number }[]>`select count(*)::int as n from wishlist_items where member_id = ${m.id}`
      const [p] = await tx<{ n: number }[]>`select count(*)::int as n from member_picks where member_id = ${m.id}`
      await tx`delete from wishlist_items where member_id = ${m.id}`
      await tx`delete from member_picks where member_id = ${m.id}`
      await tx`delete from pick_log where member_id = ${m.id}`
      await tx`delete from member_invites where member_id = ${m.id} and used_at is null`
      await tx`update members set bio = null, wishlist_public = false, auth_user_id = null, updated_at = now() where id = ${m.id}`
      // The audit row names the record and the reason, not the email (the email is part of what is being erased).
      await audit(tx, { ...who, email: '' }, 'member.account_deleted', 'members', m.id, { had_bio: !!m.bio, wishlist_items: w.n, picks: p.n }, { reason, kept: 'attendance and discussions' })
    } else {
      await audit(tx, { ...who, email: '' }, 'account.deleted', 'auth.users', who.id, null, { reason })
    }
    await tx`update audit_log set actor_email = null where actor = ${who.id} and actor_email is not null`
    // Slice D tables hold no foreign key to auth.users: clear this login's rows here (skipped where the migration is not applied yet)
    await tx.savepoint(async (sp) => {
      await sp`delete from recovery_phrases where user_id = ${who.id}`
      await sp`delete from reset_codes where user_id = ${who.id}`
      await sp`delete from auth_security where user_id = ${who.id}`
      await sp`delete from session_prefs where user_id = ${who.id}`
    }).catch((e) => { if ((e as { code?: string }).code !== '42P01') throw e })
    await tx`delete from auth.users where id = ${who.id}`
  })
  revalidatePath('/members/[id]', 'page') // the reader page may have shown this wishlist; do not wait out the 60 s cache
  return ok({ deleted: true }, NO_STORE)
}, 'write')
