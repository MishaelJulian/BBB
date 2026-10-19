import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'
import { hashInvite, normalizeCode, normalizePin } from '@/lib/invite'
import { readJson } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const INVALID = 'That invite is not valid, has expired, or was already used.' // one message for every failure, so invites cannot be probed

// "You're invited as Abhiram": the first name of the record an unused, unexpired invite belongs to. Nothing else, and nothing signs in.
export const POST = route(async (req: NextRequest) => {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const [lim] = await sql()<{ ok: boolean }[]>`select hit_rate_limit(${'join:' + ip}, 60, 10) as ok`
  if (lim && !lim.ok) return apiError(429, 'Too many tries. Wait a minute and try again.', { 'Retry-After': '60', ...NO_STORE })
  const body = await readJson(req)
  const code = typeof body?.code === 'string' ? normalizeCode(body.code) : null
  if (!code) return apiError(404, INVALID, NO_STORE)
  const pin = normalizePin(body?.pin)
  const [row] = await sql()<{ display_name: string }[]>`
    select m.display_name from member_invites i join members m on m.id = i.member_id
    where i.code_hash = ${hashInvite(code, pin)} and i.used_at is null and i.expires_at > now() and m.auth_user_id is null`
  if (!row) return apiError(404, INVALID, NO_STORE)
  return ok({ name: row.display_name.split(' ')[0] }, NO_STORE)
})
