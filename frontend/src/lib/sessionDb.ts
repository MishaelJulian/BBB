import type { Sql, TransactionSql } from 'postgres'
import { DAY, KEEP_WINDOW, isExpired, sessionStart, type JwtFacts } from './sessionPolicy'

/** A pool or a transaction: both take the same tagged queries. */
export type Q = Sql | TransactionSql

export type SessionVerdict = { status: 'ok' | 'expired' | 'revoked'; start: number | null; keep: boolean }

/**
 * Is this (already Supabase-verified) session still allowed? Start time = the earliest of the token's amr timestamp and our own
 * row for the session, so a refresh cannot slide it. Tokens that carry no session facts (not from Supabase) are not judged here.
 * If the Slice D tables do not exist yet the check falls back to the token alone, so an unapplied migration cannot lock everyone out.
 */
export async function evaluateSession(db: Q, input: { userId: string; role: string | null; facts: JwtFacts; now: number }): Promise<SessionVerdict> {
  const { userId, role, facts, now } = input
  const sid = facts.sessionId
  if (!sid && facts.amrStart === null) return { status: 'ok', start: null, keep: false }
  try {
    let start = facts.amrStart
    let keep = false
    if (sid) {
      const [row] = await db<{ started_at: string; keep: number }[]>`select started_at, keep from session_prefs where session_id = ${sid}`
      if (row) {
        start = sessionStart(Number(row.started_at), facts.amrStart)
        keep = Number(row.keep) === 1
      } else {
        // First time we see this session (sign-in did not report it, or it began before Slice D): record it now.
        start = sessionStart(facts.amrStart, now) as number
        await db`delete from session_prefs where started_at < ${now - 100 * DAY}`
        await db`insert into session_prefs (session_id, user_id, started_at, keep) values (${sid}, ${userId}, ${start}, 0) on conflict (session_id) do nothing`
      }
    }
    if (start === null) return { status: 'ok', start: null, keep }
    const [sec] = await db<{ valid_after: string }[]>`select valid_after from auth_security where user_id = ${userId}`
    if (sec && start < Number(sec.valid_after)) return { status: 'revoked', start, keep }
    return { status: isExpired(start, role, keep, now) ? 'expired' : 'ok', start, keep }
  } catch (e) {
    if ((e as { code?: string }).code === '42P01') {
      console.error('Slice D tables are missing: session lengths use the token alone until the migration is applied')
      const start = facts.amrStart
      return { status: start !== null && isExpired(start, role, false, now) ? 'expired' : 'ok', start, keep: false }
    }
    throw e
  }
}

/** Sign-in reports its session and the "Keep me signed in" choice. Keep is honoured only in the first minutes of a session, and never for admins. */
export async function startSession(db: Q, input: { userId: string; role: string | null; facts: JwtFacts; keep: boolean; now: number }): Promise<{ keep: boolean }> {
  const { userId, role, facts, now } = input
  if (!facts.sessionId) return { keep: false }
  const start = sessionStart(facts.amrStart, now) as number
  const wantKeep = input.keep && role !== 'admin' && now - start <= KEEP_WINDOW
  await db`delete from session_prefs where started_at < ${now - 100 * DAY}`
  await db`
    insert into session_prefs (session_id, user_id, started_at, keep) values (${facts.sessionId}, ${userId}, ${start}, ${wantKeep ? 1 : 0})
    on conflict (session_id) do update set keep = excluded.keep where ${now} - session_prefs.started_at <= ${KEEP_WINDOW}`
  const [row] = await db<{ keep: number }[]>`select keep from session_prefs where session_id = ${facts.sessionId}`
  return { keep: Number(row?.keep) === 1 }
}
