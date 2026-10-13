import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { audit } from '@/lib/audit'
import { apiError, ok, route } from '@/lib/http'
import { hashCode, normalizeCode } from '@/lib/invite'
import { caller, readJson } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const INVALID = 'That code is not valid, has expired, or was already used.' // one message for every failure, so codes cannot be probed

// Link this login to the member record an admin invited, using the one-time code.
export const POST = route(async (req: NextRequest) => {
  const user = await caller(req)
  if (!user) return apiError(401, 'Sign in to continue.', NO_STORE)
  const body = await readJson(req)
  const code = typeof body?.code === 'string' ? normalizeCode(body.code) : null

  // At most 5 tries a minute per login, whatever the code looks like.
  const [lim] = await sql()<{ ok: boolean }[]>`select hit_rate_limit(${'claim:' + user.id}, 60, 5) as ok`
  if (lim && !lim.ok) return apiError(429, 'Too many tries. Wait a minute and try again.', { 'Retry-After': '60', ...NO_STORE })
  if (!code) return apiError(400, INVALID, NO_STORE)

  try {
    const member = await sql().begin(async (tx) => {
      const [inv] = await tx<{ id: string; member_id: string }[]>`
        select id, member_id from member_invites where code_hash = ${hashCode(code)} and used_at is null and expires_at > now() for update`
      if (!inv) return null
      const [m] = await tx<{ id: string; display_name: string; bio: string | null }[]>`
        update members set auth_user_id = ${user.id}, updated_at = now()
        where id = ${inv.member_id} and auth_user_id is null returning id, display_name, bio`
      if (!m) return null
      await tx`update member_invites set used_by = ${user.id}, used_at = now() where id = ${inv.id}`
      await audit(tx, user, 'member.claim', 'members', m.id, null, { auth_user_id: user.id })
      return m
    })
    if (!member) return apiError(400, INVALID, NO_STORE)
    return ok({ member }, NO_STORE)
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return apiError(409, 'This login is already linked to a member.', NO_STORE) // members.auth_user_id is unique
    throw e
  }
}, 'write')
