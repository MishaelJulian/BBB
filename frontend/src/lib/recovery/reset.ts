import { createHash } from 'node:crypto'
import { normalizeCode } from '../invite'
import type { Q } from '../sessionDb'
import { FRESH_WINDOW } from '../sessionPolicy'
import { hashResetCode } from './codes'
import { generatePhrase, hashSecret, normalizePhrase, verifySecret } from './phrase'

export const GENERIC_FAIL = 'These details do not match. Check your email and the words or code, then try again.'
export const TOO_MANY = 'Too many tries. Wait a while and try again.'
export const MIN_MS = 700 // every answer after the limits takes at least this long, found or not
// emailPer15Min/emailPerDay are counted per (email, ip), so a stranger's junk attempts only lock out that stranger's IP.
// emailCapPerDay is the ceiling for one email across all IPs: guessing stays capped at 60 a day against 132-bit words / 50-bit codes.
export const LIMITS = { ipPerHour: 15, emailPer15Min: 5, emailPerDay: 10, emailCapPerDay: 60 }

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
export type SetPassword = (userId: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
export type ResetResult = { ok: true; phrase: string[] } | { ok: false; status: 400 | 422 | 429 | 503; message: string }

/** An audit row for an event that may have no signed-in actor. The secret is never written; an unknown email is stored only as a hash prefix. */
export async function auditAuth(db: Q, action: string, actor: string | null, email: string | null, rowId: string | null, after: unknown) {
  await db`insert into audit_log (actor, actor_email, action, table_name, row_id, after)
           values (${actor}, ${email}, ${action}, 'auth.users', ${rowId}, ${after === null || after === undefined ? null : db.json(after as never)})`
}

async function hit(db: Q, bucket: string, window: number, limit: number): Promise<boolean> {
  const [r] = await db<{ ok: boolean }[]>`select hit_rate_limit(${bucket}, ${window}, ${limit}) as ok`
  return r ? r.ok : true
}

/** Make (or replace) the login's phrase. Returns the words, to be shown once. */
export async function issuePhrase(db: Q, userId: string, now: number): Promise<string[]> {
  const words = generatePhrase()
  const h = await hashSecret(words.join(' '))
  await db`insert into recovery_phrases (user_id, phrase_hash, created_at) values (${userId}, ${h}, ${now})
           on conflict (user_id) do update set phrase_hash = excluded.phrase_hash, created_at = excluded.created_at`
  return words
}

export async function phraseStatus(db: Q, userId: string): Promise<{ has: boolean; created_at: number | null }> {
  const [r] = await db<{ created_at: string }[]>`select created_at from recovery_phrases where user_id = ${userId}`
  return { has: !!r, created_at: r ? Number(r.created_at) : null }
}

/** May this login get its FIRST phrase without typing the password? Only a brand-new session on a login that never had one. */
export const mayIssueFirst = (has: boolean, sessionStart: number | null | undefined, now: number) => !has && typeof sessionStart === 'number' && now - sessionStart <= FRESH_WINDOW

/**
 * Forgot password, in one request: email + (12 words | admin code) + new password.
 * Same failure for an unknown email, a login without a phrase, wrong words and a wrong, expired, used or revoked code.
 * Limits are counted for every email whether or not it exists. The secret is consumed first and given back if setting the password fails.
 */
export async function resetPassword(
  db: Q,
  input: { email: unknown; phrase?: unknown; code?: unknown; password: unknown },
  ctx: { ip: string; now: number; setPassword: SetPassword; minMs?: number; sessionsGone?: (db: Q, userId: string) => Promise<void> },
): Promise<ResetResult> {
  const t0 = Date.now()
  const finish = async <T,>(r: T): Promise<T> => {
    const wait = (ctx.minMs ?? MIN_MS) - (Date.now() - t0)
    if (wait > 0) await sleep(wait)
    return r
  }
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  if (!email || email.length > 254 || !email.includes('@')) return { ok: false, status: 422, message: 'Enter your email.' }
  const password = typeof input.password === 'string' ? input.password : ''
  if (password.length < 8) return { ok: false, status: 422, message: 'Use 8 or more characters.' }
  if (password.length > 72) return { ok: false, status: 422, message: 'Use 72 characters or fewer.' }
  const phrase = input.phrase !== undefined ? normalizePhrase(input.phrase) : null
  const code = input.code !== undefined ? normalizeCode(String(input.code)) : null
  const method = input.phrase !== undefined ? 'phrase' : input.code !== undefined ? 'code' : null
  if (!method) return { ok: false, status: 422, message: 'Enter your 12 words or a reset code.' }
  if (method === 'phrase' && !phrase) return { ok: false, status: 422, message: 'Enter all 12 words, separated by spaces.' }
  if (method === 'code' && !code) return { ok: false, status: 422, message: 'That reset code does not look right. It has 10 letters and numbers.' }

  const eh = sha(email).slice(0, 16)
  const ih = sha(ctx.ip).slice(0, 12)
  const [a, b, c, d] = [
    await hit(db, `reset-ip:${ctx.ip}`, 3600, LIMITS.ipPerHour),
    await hit(db, `reset-mail:${eh}:${ih}`, 900, LIMITS.emailPer15Min),
    await hit(db, `reset-day:${eh}:${ih}`, 86400, LIMITS.emailPerDay),
    await hit(db, `reset-cap:${eh}`, 86400, LIMITS.emailCapPerDay),
  ]
  if (!(a && b && c && d)) {
    if (await hit(db, `reset-log:${eh}`, 3600, 1)) await auditAuth(db, 'auth.reset.blocked', null, null, null, { email_sha256: eh, method })
    return finish({ ok: false, status: 429, message: TOO_MANY })
  }

  const [u] = await db<{ id: string }[]>`select id::text as id from auth.users where lower(email) = ${email} limit 1`
  const fail = async (why: string): Promise<ResetResult> => {
    await auditAuth(db, 'auth.reset.failed', u?.id ?? null, null, u?.id ?? null, { email_sha256: eh, method, why })
    return finish({ ok: false, status: 400, message: GENERIC_FAIL })
  }

  // Step 1: prove it, and take the secret out of circulation in the same statement.
  let undo: () => Promise<void>
  let newHash: string | null = null
  const newWords = generatePhrase()
  if (method === 'phrase') {
    const [row] = u ? await db<{ phrase_hash: string }[]>`select phrase_hash from recovery_phrases where user_id = ${u.id}` : []
    const good = await verifySecret(phrase!, row?.phrase_hash)
    if (!u || !row || !good) return fail('no match')
    newHash = await hashSecret(newWords.join(' '))
    const taken = await db`update recovery_phrases set phrase_hash = ${newHash}, created_at = ${ctx.now} where user_id = ${u.id} and phrase_hash = ${row.phrase_hash} returning user_id`
    if (!taken.length) return fail('raced')
    const old = row.phrase_hash
    undo = async () => { await db`update recovery_phrases set phrase_hash = ${old} where user_id = ${u.id} and phrase_hash = ${newHash}` }
  } else {
    await verifySecret('x', null) // the same scrypt cost as the phrase path, whatever the answer
    const taken = u
      ? await db<{ id: string }[]>`update reset_codes set used_at = ${ctx.now}
          where code_hash = ${hashResetCode(code!)} and user_id = ${u.id} and used_at is null and revoked_at is null and expires_at > ${ctx.now} returning id`
      : []
    if (!u || !taken.length) return fail('no match')
    const codeId = taken[0].id
    newHash = await hashSecret(newWords.join(' '))
    undo = async () => { await db`update reset_codes set used_at = null where id = ${codeId}` }
  }

  // Step 2: write the new phrase (code path) and refuse every older session BEFORE the password changes,
  // so the last write cannot fail after the secret is spent. Anything that fails below gives it all back.
  const [prevSec] = await db<{ valid_after: string }[]>`select valid_after from auth_security where user_id = ${u.id}`
  const [prevPhrase] = method === 'code' ? await db<{ phrase_hash: string; created_at: string }[]>`select phrase_hash, created_at from recovery_phrases where user_id = ${u.id}` : []
  const giveBack = async () => {
    await undo().catch(() => {})
    if (method === 'code') {
      if (prevPhrase) await db`update recovery_phrases set phrase_hash = ${prevPhrase.phrase_hash}, created_at = ${prevPhrase.created_at} where user_id = ${u.id}`.catch(() => {})
      else await db`delete from recovery_phrases where user_id = ${u.id}`.catch(() => {})
    }
    if (prevSec) await db`update auth_security set valid_after = ${prevSec.valid_after} where user_id = ${u.id}`.catch(() => {})
    else await db`delete from auth_security where user_id = ${u.id}`.catch(() => {})
  }
  try {
    if (method === 'code') {
      await db`insert into recovery_phrases (user_id, phrase_hash, created_at) values (${u.id}, ${newHash}, ${ctx.now})
               on conflict (user_id) do update set phrase_hash = excluded.phrase_hash, created_at = excluded.created_at`
    }
    await db`insert into auth_security (user_id, valid_after) values (${u.id}, ${ctx.now})
             on conflict (user_id) do update set valid_after = excluded.valid_after`
  } catch {
    await giveBack()
    return finish({ ok: false, status: 503, message: 'Something went wrong. Try again.' })
  }

  // Step 3: set the new password at Supabase. If that fails, give everything back.
  const set = await ctx.setPassword(u.id, password).catch(() => ({ ok: false as const, message: 'The login service is not reachable.' }))
  if (!set.ok) {
    await giveBack()
    await auditAuth(db, 'auth.reset.error', u.id, null, u.id, { method, message: set.message })
    return finish({ ok: false, status: 503, message: set.message })
  }
  if (ctx.sessionsGone) await ctx.sessionsGone(db, u.id).catch(() => {})
  await auditAuth(db, 'auth.reset.ok', u.id, null, u.id, { method })
  await auditAuth(db, 'auth.phrase.created', u.id, null, u.id, { via: 'reset' })
  return finish({ ok: true, phrase: newWords })
}

