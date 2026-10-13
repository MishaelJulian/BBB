import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { audit } from '@/lib/audit'
import { checkAdmin } from '@/lib/admin'
import { apiError, ok, route } from '@/lib/http'
import { hashCode, newInviteCode, normalizeCode } from '@/lib/invite'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }
type Made = { error: 404 | 409 } | { code: string; expires_at: string; member: string }

// Admin makes a one-time code for a member. The code is returned once and never stored; earlier unused codes for that member stop working.
export const POST = route<{ id: string }>(async (req: NextRequest, { params }) => {
  const who = await checkAdmin(req)
  if (who.status === 'unauthenticated') return apiError(401, 'Sign in to continue.', NO_STORE)
  if (who.status === 'forbidden') return apiError(403, 'Admin privileges required.', NO_STORE)
  const { id } = await params

  const result = await sql().begin(async (tx): Promise<Made> => {
    const [member] = await tx<{ id: string; display_name: string; auth_user_id: string | null }[]>`
      select id, display_name, auth_user_id from members where id = ${id} for update`
    if (!member) return { error: 404 as const }
    if (member.auth_user_id) return { error: 409 as const }
    const code = newInviteCode()
    await tx`update member_invites set expires_at = now() where member_id = ${id} and used_at is null and expires_at > now()`
    const [inv] = await tx<{ expires_at: string }[]>`
      insert into member_invites (member_id, code_hash, created_by) values (${id}, ${hashCode(normalizeCode(code)!)}, ${who.user.id}) returning expires_at`
    await audit(tx, who.user, 'member.invite', 'members', id, null, { member: member.display_name })
    return { code, expires_at: inv.expires_at, member: member.display_name }
  })
  if ('error' in result) return apiError(result.error, result.error === 404 ? 'Member not found.' : 'That member has already claimed their record.', NO_STORE)
  return ok(result, NO_STORE)
}, 'write')
