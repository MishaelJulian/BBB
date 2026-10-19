// Runs against a THROWAWAY Postgres only (never the live database): each test runs in a transaction that is rolled back.
//   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/slice_d npx vitest run src/lib/recovery
import { createHash } from 'node:crypto'
import postgres, { type TransactionSql } from 'postgres'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { hashResetCode, issueResetCode, revokeResetCode } from './codes'
import { generatePhrase, hashSecret, normalizePhrase, verifySecret } from './phrase'
import { GENERIC_FAIL, LIMITS, issuePhrase, mayIssueFirst, phraseStatus, resetPassword, TOO_MANY, type SetPassword } from './reset'
import { WORDS } from './wordlist'
import { evaluateSession, startSession } from '../sessionDb'
import { ADMIN_ALLOWANCE, DAY, jwtFacts, KEEP_ALLOWANCE, MEMBER_ALLOWANCE } from '../sessionPolicy'
import type { Caller } from '../session'
import { newInviteCode, normalizeCode, hashInvite } from '../invite'

const url = process.env.DATABASE_URL ?? ''
const local = /127\.0\.0\.1|localhost/.test(url)
const db = local ? postgres(url, { max: 2, prepare: false }) : (null as never)
const admin: Caller = { id: '11111111-1111-1111-1111-111111111111', email: 'test-admin@bbb.test', role: 'admin' }
const NOW = 1_900_000_000
const UID = '22222222-2222-2222-2222-222222222222'

afterAll(async () => { await db?.end() })

class Rollback extends Error {}
async function inTx<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
  let out!: T
  try {
    await db.begin(async (tx) => {
      out = await fn(tx)
      throw new Rollback()
    })
  } catch (e) {
    if (!(e instanceof Rollback)) throw e
  }
  return out
}
/** A login (auth.users) linked to a real member record. */
async function linked(tx: TransactionSql, email = 'reader@bbb.test', uid = UID) {
  await tx`insert into auth.users (id, email) values (${uid}, ${email})`
  const [m] = await tx<{ id: string }[]>`select id from members where auth_user_id is null and status = 'member' limit 1`
  await tx`update members set auth_user_id = ${uid} where id = ${m.id}`
  return m.id
}
const okSet = (calls: { id: string; pw: string }[] = []): SetPassword => async (id, pw) => { calls.push({ id, pw }); return { ok: true } }
const ctx = (set: SetPassword, over: Partial<{ ip: string; now: number }> = {}) => ({ ip: '203.0.113.9', now: NOW, setPassword: set, minMs: 0, ...over })

describe('word list and phrase', () => {
  it('is the BIP39 English list, byte for byte', () => {
    expect(WORDS).toHaveLength(2048)
    expect(new Set(WORDS).size).toBe(2048)
    expect(createHash('sha256').update(WORDS.join('\n') + '\n').digest('hex')).toBe('2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda')
  })
  it('makes 12 listed words, different every time', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const p = generatePhrase()
      expect(p).toHaveLength(12)
      expect(p.every((w) => WORDS.includes(w))).toBe(true)
      seen.add(p.join(' '))
    }
    expect(seen.size).toBe(300)
  })
  it('forgives case, spaces, commas and line breaks; rejects the rest', () => {
    const p = generatePhrase()
    expect(normalizePhrase(`  ${p.join('  ').toUpperCase()} `)).toBe(p.join(' '))
    expect(normalizePhrase(p.join(',\n'))).toBe(p.join(' '))
    expect(normalizePhrase(p.slice(0, 11).join(' '))).toBeNull()
    expect(normalizePhrase([...p.slice(0, 11), 'notaword'].join(' '))).toBeNull()
    expect(normalizePhrase(undefined)).toBeNull()
  })
  it('hashes with a random salt and checks in constant form', async () => {
    const w = generatePhrase().join(' ')
    const a = await hashSecret(w), b = await hashSecret(w)
    expect(a).not.toBe(b)
    expect(a.startsWith('scrypt$32768$8$1$')).toBe(true)
    expect(a).not.toContain(w)
    expect(await verifySecret(w, a)).toBe(true)
    expect(await verifySecret(generatePhrase().join(' '), a)).toBe(false)
    expect(await verifySecret(w, null)).toBe(false)
    expect(await verifySecret(w, 'garbage')).toBe(false)
  })
})

describe('session policy (pure)', () => {
  const jwt = (p: object) => `x.${Buffer.from(JSON.stringify(p)).toString('base64url')}.y`
  it('reads session id, earliest amr timestamp and role from app_metadata only', () => {
    const f = jwtFacts(jwt({ session_id: 's1', amr: [{ method: 'password', timestamp: 500 }, { method: 'otp', timestamp: 300 }], app_metadata: { role: 'admin' }, user_metadata: { role: 'admin2' } }))
    expect(f).toEqual({ sessionId: 's1', amrStart: 300, role: 'admin' })
    expect(jwtFacts('nope')).toEqual({ sessionId: null, amrStart: null, role: null })
    expect(jwtFacts(jwt({ user_metadata: { role: 'admin' } })).role).toBeNull()
  })
  it('first phrase without a password only for a fresh session on a login that never had one', () => {
    expect(mayIssueFirst(false, NOW - 60, NOW)).toBe(true)
    expect(mayIssueFirst(false, NOW - 3600, NOW)).toBe(false)
    expect(mayIssueFirst(true, NOW - 60, NOW)).toBe(false)
    expect(mayIssueFirst(false, null, NOW)).toBe(false)
  })
})

describe.skipIf(!local)('session lengths (local database)', () => {
  const f = (sid: string, start: number | null) => ({ sessionId: sid, amrStart: start, role: null })
  it('admin 24 h, member 30 days, keep 90 days, from sign-in time', async () => {
    await inTx(async (tx) => {
      const go = (role: string | null, sid: string, start: number, now: number) => evaluateSession(tx, { userId: UID, role, facts: f(sid, start), now }).then((v) => v.status)
      expect(await go('admin', 'a1', NOW, NOW + ADMIN_ALLOWANCE)).toBe('ok')
      expect(await go('admin', 'a1', NOW, NOW + ADMIN_ALLOWANCE + 1)).toBe('expired')
      expect(await go(null, 'm1', NOW, NOW + MEMBER_ALLOWANCE)).toBe('ok')
      expect(await go(null, 'm1', NOW, NOW + MEMBER_ALLOWANCE + 1)).toBe('expired')
      // keep me signed in: 90 days
      await startSession(tx, { userId: UID, role: null, facts: f('k1', NOW), keep: true, now: NOW + 5 })
      expect(await go(null, 'k1', NOW, NOW + KEEP_ALLOWANCE)).toBe('ok')
      expect(await go(null, 'k1', NOW, NOW + KEEP_ALLOWANCE + 1)).toBe('expired')
    })
  })
  it('keep is ignored for admins and cannot be added later (stolen-token upgrade)', async () => {
    await inTx(async (tx) => {
      expect((await startSession(tx, { userId: UID, role: 'admin', facts: f('a2', NOW), keep: true, now: NOW + 5 })).keep).toBe(false)
      await startSession(tx, { userId: UID, role: null, facts: f('late', NOW), keep: false, now: NOW + 5 })
      expect((await startSession(tx, { userId: UID, role: null, facts: f('late', NOW), keep: true, now: NOW + 3 * DAY })).keep).toBe(false)
      const v = await evaluateSession(tx, { userId: UID, role: null, facts: f('late', NOW), now: NOW + 31 * DAY })
      expect(v.status).toBe('expired')
    })
  })
  it('a refresh cannot extend a session: a slid amr timestamp does not beat our own start row', async () => {
    await inTx(async (tx) => {
      await startSession(tx, { userId: UID, role: null, facts: f('r1', NOW), keep: false, now: NOW + 2 })
      // 29 days later the token is refreshed; suppose a (hypothetical) Supabase version moved the amr stamp to now
      const refreshedAt = NOW + 29 * DAY
      expect((await evaluateSession(tx, { userId: UID, role: null, facts: f('r1', refreshedAt), now: refreshedAt })).status).toBe('ok')
      const later = NOW + 31 * DAY
      expect((await evaluateSession(tx, { userId: UID, role: null, facts: f('r1', later - 100), now: later })).status).toBe('expired')
    })
  })
  it('an unknown session is recorded on first sight, from the token, not from the time it is first seen', async () => {
    await inTx(async (tx) => {
      const v = await evaluateSession(tx, { userId: UID, role: null, facts: f('new1', NOW - 40 * DAY), now: NOW })
      expect(v.status).toBe('expired')
      const [row] = await tx`select started_at from session_prefs where session_id = 'new1'`
      expect(Number(row.started_at)).toBe(NOW - 40 * DAY)
    })
  })
  it('sessions that began before a password reset are refused', async () => {
    await inTx(async (tx) => {
      await tx`insert into auth_security (user_id, valid_after) values (${UID}, ${NOW})`
      expect((await evaluateSession(tx, { userId: UID, role: null, facts: f('old', NOW - 10), now: NOW + 5 })).status).toBe('revoked')
      expect((await evaluateSession(tx, { userId: UID, role: null, facts: f('fresh', NOW + 2), now: NOW + 5 })).status).toBe('ok')
    })
  })
  it('tokens without session facts are not judged', async () => {
    await inTx(async (tx) => {
      expect((await evaluateSession(tx, { userId: UID, role: null, facts: { sessionId: null, amrStart: null, role: null }, now: NOW })).status).toBe('ok')
    })
  })
})

describe.skipIf(!local)('caller() enforces the allowance and tells the browser (local database)', () => {
  it('answers a 401 session_expired for an over-age session and passes a fresh one', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://auth.test'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pub'
    const { caller } = await import('../session')
    const { NextRequest } = await import('next/server')
    const tok = (sid: string, start: number) => `h.${Buffer.from(JSON.stringify({ session_id: sid, amr: [{ method: 'password', timestamp: start }], app_metadata: {} })).toString('base64url')}.s`
    const calls: string[] = []
    const real = globalThis.fetch
    vi.stubGlobal('fetch', async (u: string) => {
      calls.push(String(u))
      return new Response(JSON.stringify({ id: UID, email: 'x@bbb.test', app_metadata: {} }), { status: 200 })
    })
    const nowS = Math.floor(Date.now() / 1000)
    const req = (t: string) => new NextRequest('http://x/api/me', { headers: { authorization: `Bearer ${t}` } })
    try {
      expect((await caller(req(tok('cs-fresh', nowS - 3600))))?.id).toBe(UID)
      await expect(caller(req(tok('cs-old', nowS - 31 * DAY)))).rejects.toMatchObject({ status: 401, message: 'Your previous session has expired. Sign in again.' })
      expect(calls.some((c) => c.includes('/auth/v1/logout?scope=local'))).toBe(true) // the Supabase session is ended too
      expect((await caller(req(tok('cs-29', nowS - 29 * DAY))))?.id).toBe(UID)
    } finally {
      vi.stubGlobal('fetch', real)
      await db`delete from session_prefs where session_id like 'cs-%'`
    }
  })
})

describe.skipIf(!local)('admin reset codes (local database)', () => {
  it('issues one live code for 24 hours, shown once, stored hashed, only for a linked account', async () => {
    await inTx(async (tx) => {
      const [unlinked] = await tx<{ id: string }[]>`select id from members where auth_user_id is null limit 1`
      await expect(issueResetCode(tx, admin, unlinked.id, NOW)).rejects.toMatchObject({ status: 409 })
      const mid = await linked(tx)
      const a = await issueResetCode(tx, admin, mid, NOW)
      expect(a.expires_at - NOW).toBe(24 * 3600)
      const rows = await tx`select code_hash, user_id from reset_codes where member_id = ${mid}`
      expect(JSON.stringify(rows)).not.toContain(a.code.replace('-', ''))
      expect(rows[0].code_hash).toBe(hashResetCode(normalizeCode(a.code)!))
      // a claim code of the same text does not hash to the same value
      expect(hashInvite(normalizeCode(a.code)!)).not.toBe(rows[0].code_hash)
      const b = await issueResetCode(tx, admin, mid, NOW + 10) // revokes the first
      const live = await tx`select 1 from reset_codes where member_id = ${mid} and used_at is null and revoked_at is null`
      expect(live).toHaveLength(1)
      expect(b.code).not.toBe(a.code)
      const [au] = await tx`select action, after from audit_log where action = 'member.reset_code' order by id desc limit 1`
      expect(JSON.stringify(au.after)).not.toContain(b.code)
      await expect(revokeResetCode(tx, admin, a.code_id, NOW + 20)).rejects.toMatchObject({ status: 409 }) // already revoked
    })
  })
})

describe.skipIf(!local)('forgot password (local database)', () => {
  it('phrase: sets the password, kills the old phrase, issues a new one, ends older sessions, audits without secrets', async () => {
    await inTx(async (tx) => {
      await linked(tx)
      const words = await issuePhrase(tx, UID, NOW - 100)
      const calls: { id: string; pw: string }[] = []
      const r = await resetPassword(tx, { email: 'Reader@BBB.test ', phrase: words.join(' ').toUpperCase(), password: 'brand-new-pass' }, ctx(okSet(calls)))
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(calls).toEqual([{ id: UID, pw: 'brand-new-pass' }])
      expect(r.phrase).toHaveLength(12)
      expect(r.phrase.join(' ')).not.toBe(words.join(' '))
      const again = await resetPassword(tx, { email: 'reader@bbb.test', phrase: words.join(' '), password: 'another-pass-1' }, ctx(okSet(calls)))
      expect(again).toMatchObject({ ok: false, status: 400, message: GENERIC_FAIL })
      const third = await resetPassword(tx, { email: 'reader@bbb.test', phrase: r.phrase.join(' '), password: 'another-pass-2' }, ctx(okSet(calls)))
      expect(third.ok).toBe(true)
      const [sec] = await tx`select valid_after from auth_security where user_id = ${UID}`
      expect(Number(sec.valid_after)).toBe(NOW)
      const logged = JSON.stringify(await tx`select * from audit_log where action like 'auth.%' and actor::text = ${UID}`)
      for (const secret of [...words, 'brand-new-pass', 'another-pass-1']) expect(logged).not.toContain(secret)
      expect(logged).toContain('auth.reset.ok')
      expect(logged).toContain('auth.reset.failed')
      expect(logged).toContain('auth.phrase.created')
    })
  })

  it('admin code: works once, a second use fails, the new phrase works', async () => {
    await inTx(async (tx) => {
      const mid = await linked(tx)
      const { code } = await issueResetCode(tx, admin, mid, NOW)
      const calls: { id: string; pw: string }[] = []
      const r = await resetPassword(tx, { email: 'reader@bbb.test', code: code.toLowerCase().replace('-', ' '), password: 'brand-new-pass' }, ctx(okSet(calls), { now: NOW + 60 }))
      expect(r.ok).toBe(true)
      expect(calls).toHaveLength(1)
      const reuse = await resetPassword(tx, { email: 'reader@bbb.test', code, password: 'brand-new-pass-2' }, ctx(okSet(calls), { now: NOW + 70 }))
      expect(reuse).toMatchObject({ ok: false, status: 400, message: GENERIC_FAIL })
      expect(calls).toHaveLength(1)
      const [{ n }] = await tx`select count(*)::int as n from recovery_phrases where user_id = ${UID}`
      expect(n).toBe(1)
      if (r.ok) expect((await resetPassword(tx, { email: 'reader@bbb.test', phrase: r.phrase.join(' '), password: 'x-new-pass-3' }, ctx(okSet(calls), { now: NOW + 80 }))).ok).toBe(true)
    })
  })

  it("admin code: expired, revoked, someone else's and a claim code all fail the same way", async () => {
    await inTx(async (tx) => {
      const mid = await linked(tx)
      const c1 = await issueResetCode(tx, admin, mid, NOW)
      const calls: { id: string; pw: string }[] = []
      const late = await resetPassword(tx, { email: 'reader@bbb.test', code: c1.code, password: 'brand-new-pass' }, ctx(okSet(calls), { now: NOW + 24 * 3600 + 1 }))
      expect(late).toMatchObject({ ok: false, status: 400, message: GENERIC_FAIL })
      const c2 = await issueResetCode(tx, admin, mid, NOW + 100)
      await revokeResetCode(tx, admin, c2.code_id, NOW + 110)
      expect(await resetPassword(tx, { email: 'reader@bbb.test', code: c2.code, password: 'brand-new-pass' }, ctx(okSet(calls), { now: NOW + 120 }))).toMatchObject({ ok: false, message: GENERIC_FAIL })
      // a second login with its own code cannot be used against the first login's email
      await tx`insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'other@bbb.test')`
      const [m2] = await tx<{ id: string }[]>`select id from members where auth_user_id is null and status = 'member' limit 1`
      await tx`update members set auth_user_id = '33333333-3333-3333-3333-333333333333' where id = ${m2.id}`
      const c3 = await issueResetCode(tx, admin, m2.id, NOW + 200)
      expect(await resetPassword(tx, { email: 'reader@bbb.test', code: c3.code, password: 'brand-new-pass' }, ctx(okSet(calls), { now: NOW + 210 }))).toMatchObject({ ok: false, message: GENERIC_FAIL })
      // an invite (claim) code is a different namespace
      const claim = newInviteCode()
      await tx`insert into member_invites (member_id, code_hash) values (${m2.id}, ${hashInvite(normalizeCode(claim)!)})`
      expect(await resetPassword(tx, { email: 'other@bbb.test', code: claim, password: 'brand-new-pass' }, ctx(okSet(calls), { now: NOW + 220 }))).toMatchObject({ ok: false, message: GENERIC_FAIL })
      expect(calls).toHaveLength(0)
    })
  })

  it('gives the secret back when Supabase refuses the password', async () => {
    await inTx(async (tx) => {
      const mid = await linked(tx)
      const { code } = await issueResetCode(tx, admin, mid, NOW)
      const bad: SetPassword = async () => ({ ok: false, message: 'Password is too weak.' })
      expect(await resetPassword(tx, { email: 'reader@bbb.test', code, password: 'password1' }, ctx(bad, { now: NOW + 5 }))).toMatchObject({ ok: false, status: 503, message: 'Password is too weak.' })
      expect((await resetPassword(tx, { email: 'reader@bbb.test', code, password: 'a-good-password' }, ctx(okSet(), { now: NOW + 6 }))).ok).toBe(true)
      const words = await issuePhrase(tx, UID, NOW)
      expect((await resetPassword(tx, { email: 'reader@bbb.test', phrase: words.join(' '), password: 'password1' }, ctx(bad, { now: NOW + 7 }))).ok).toBe(false)
      expect((await resetPassword(tx, { email: 'reader@bbb.test', phrase: words.join(' '), password: 'a-good-password' }, ctx(okSet(), { now: NOW + 8 }))).ok).toBe(true)
    })
  })

  it('answers the same for an unknown email, a login with no phrase and a wrong phrase (no enumeration)', async () => {
    await inTx(async (tx) => {
      await linked(tx)
      await issuePhrase(tx, UID, NOW)
      await tx`insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'nophrase@bbb.test')`
      const words = generatePhrase().join(' ')
      const calls: { id: string; pw: string }[] = []
      const a = await resetPassword(tx, { email: 'nobody@bbb.test', phrase: words, password: 'brand-new-pass' }, ctx(okSet(calls)))
      const b = await resetPassword(tx, { email: 'nophrase@bbb.test', phrase: words, password: 'brand-new-pass' }, ctx(okSet(calls)))
      const c = await resetPassword(tx, { email: 'reader@bbb.test', phrase: words, password: 'brand-new-pass' }, ctx(okSet(calls)))
      const d = await resetPassword(tx, { email: 'nobody@bbb.test', code: 'ABCDE-FGHJK', password: 'brand-new-pass' }, ctx(okSet(calls)))
      for (const r of [a, b, c, d]) expect(r).toEqual({ ok: false, status: 400, message: GENERIC_FAIL })
      expect(calls).toHaveLength(0)
    })
  })

  it('takes at least the minimum time, found or not', async () => {
    await inTx(async (tx) => {
      const t = Date.now()
      await resetPassword(tx, { email: 'nobody@bbb.test', phrase: generatePhrase().join(' '), password: 'brand-new-pass' }, { ...ctx(okSet()), minMs: 300 })
      expect(Date.now() - t).toBeGreaterThanOrEqual(295)
    })
  })

  it('locks an email after 5 tries in 15 minutes (existing or not), and an IP after 15 an hour', async () => {
    await inTx(async (tx) => {
      const [{ n: before }] = await tx`select count(*)::int as n from audit_log where action = 'auth.reset.blocked'`
      await linked(tx)
      const words = await issuePhrase(tx, UID, NOW)
      const bad = generatePhrase().join(' ')
      // 5 wrong tries from ONE address lock that address for this email, existing or not
      for (let i = 0; i < 5; i++) expect(await resetPassword(tx, { email: 'reader@bbb.test', phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: '10.0.0.9' }))).toMatchObject({ status: 400 })
      expect(await resetPassword(tx, { email: 'reader@bbb.test', phrase: words.join(' '), password: 'brand-new-pass' }, ctx(okSet(), { ip: '10.0.0.9' }))).toEqual({ ok: false, status: 429, message: TOO_MANY })
      for (let i = 0; i < 5; i++) expect(await resetPassword(tx, { email: 'ghost@bbb.test', phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: '10.0.2.9' }))).toMatchObject({ status: 400 })
      expect(await resetPassword(tx, { email: 'ghost@bbb.test', phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: '10.0.2.9' }))).toEqual({ ok: false, status: 429, message: TOO_MANY })
      // a stranger's junk cannot lock the real owner out: the owner, from another address, still gets in
      expect(await resetPassword(tx, { email: 'reader@bbb.test', phrase: words.join(' '), password: 'brand-new-pass' }, ctx(okSet(), { ip: '10.0.1.1' }))).toMatchObject({ ok: true })
      // but one email across many addresses is still capped (60 a day)
      for (let i = 0; i < LIMITS.emailCapPerDay; i++) await resetPassword(tx, { email: 'capped@bbb.test', phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: `10.1.${Math.floor(i / 200)}.${i % 200}` }))
      expect(await resetPassword(tx, { email: 'capped@bbb.test', phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: '10.9.9.9' }))).toEqual({ ok: false, status: 429, message: TOO_MANY })
      // one IP guessing across many emails
      for (let i = 0; i < 15; i++) await resetPassword(tx, { email: `x${i}@bbb.test`, phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: '198.51.100.7' }))
      expect(await resetPassword(tx, { email: 'x99@bbb.test', phrase: bad, password: 'brand-new-pass' }, ctx(okSet(), { ip: '198.51.100.7' }))).toMatchObject({ status: 429 })
      const blocked = await tx`select count(*)::int as n from audit_log where action = 'auth.reset.blocked'`
      expect(blocked[0].n - before).toBeLessThanOrEqual(5) // one log row per email per hour, not one per blocked request
    })
  }, 60000)

  it('checks the shape before touching anything', async () => {
    await inTx(async (tx) => {
      const c = ctx(okSet())
      expect(await resetPassword(tx, { email: '', phrase: 'a', password: 'brand-new-pass' }, c)).toMatchObject({ status: 422 })
      expect(await resetPassword(tx, { email: 'a@b.c', phrase: generatePhrase().join(' '), password: 'short' }, c)).toMatchObject({ status: 422 })
      expect(await resetPassword(tx, { email: 'a@b.c', phrase: 'one two', password: 'brand-new-pass' }, c)).toMatchObject({ status: 422 })
      expect(await resetPassword(tx, { email: 'a@b.c', password: 'brand-new-pass' }, c)).toMatchObject({ status: 422 })
      expect(await phraseStatus(tx, UID)).toEqual({ has: false, created_at: null })
    })
  })
})
