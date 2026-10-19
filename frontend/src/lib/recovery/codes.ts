import { createHash, randomUUID } from 'node:crypto'
import { HttpError } from '../http'
import { newInviteCode, normalizeCode } from '../invite'
import type { Caller } from '../session'
import type { Q } from '../sessionDb'
import { audit } from '../audit'
import type { TransactionSql } from 'postgres'

export const RESET_CODE_SECONDS = 24 * 3600 // founder: reset codes are one use, 24 hours (wave0-decisions line 546)

/** The reset namespace keeps a claim code from ever working as a reset code. */
export const hashResetCode = (normalized: string) => createHash('sha256').update(`reset:${normalized}`).digest('hex')

export interface IssuedResetCode { code: string; expires_at: number; member: string; code_id: string }

/** Admin only (the route checks). One live code per login: earlier unused ones are revoked. The code is returned once and only its hash is stored. */
export async function issueResetCode(db: Q, who: Caller, memberId: string, now = Math.floor(Date.now() / 1000)): Promise<IssuedResetCode> {
  const [m] = await db<{ id: string; display_name: string; auth_user_id: string | null }[]>`select id, display_name, auth_user_id::text as auth_user_id from members where id = ${memberId}`
  if (!m) throw new HttpError(404, 'Member not found.')
  if (!m.auth_user_id) throw new HttpError(409, 'This member has no linked account yet. Make a claim code instead.')
  await db`update reset_codes set revoked_at = ${now} where user_id = ${m.auth_user_id} and used_at is null and revoked_at is null and expires_at > ${now}`
  const code = newInviteCode()
  const id = randomUUID()
  const expires = now + RESET_CODE_SECONDS
  await db`insert into reset_codes (id, user_id, member_id, code_hash, created_by, created_at, expires_at) values (${id}, ${m.auth_user_id}, ${m.id}, ${hashResetCode(normalizeCode(code)!)}, ${who.id}, ${now}, ${expires})`
  await audit(db as TransactionSql, who, 'member.reset_code', 'members', m.id, null, { code_id: id, expires_at: expires })
  return { code, expires_at: expires, member: m.display_name, code_id: id }
}

export async function revokeResetCode(db: Q, who: Caller, id: string, now = Math.floor(Date.now() / 1000)) {
  const [c] = await db<{ member_id: string; used_at: string | null; revoked_at: string | null }[]>`select member_id, used_at, revoked_at from reset_codes where id = ${id}`
  if (!c) throw new HttpError(404, 'Code not found')
  if (c.used_at) throw new HttpError(409, 'That code was already used.')
  if (c.revoked_at) throw new HttpError(409, 'That code is already revoked.')
  await db`update reset_codes set revoked_at = ${now} where id = ${id} and used_at is null and revoked_at is null`
  await audit(db as TransactionSql, who, 'member.reset_code_revoked', 'members', c.member_id, null, { code_id: id })
  return { success: true, message: 'Code revoked.' }
}
