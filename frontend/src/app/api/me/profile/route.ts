import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { audit } from '@/lib/audit'
import { apiError, ok, route } from '@/lib/http'
import { caller, readJson } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// A member edits their own bio, and only their own: the row is found by the login, never by an id in the request.
export const PUT = route(async (req: NextRequest) => {
  const user = await caller(req)
  if (!user) return apiError(401, 'Sign in to continue.', NO_STORE)
  const body = await readJson(req)
  if (!body || (body.bio !== null && typeof body.bio !== 'string')) return apiError(422, 'bio must be text.', NO_STORE)
  const bio = typeof body.bio === 'string' ? body.bio.trim() : null
  if (bio && bio.length > 1000) return apiError(422, 'Keep the bio under 1000 characters.', NO_STORE)

  const saved = await sql().begin(async (tx) => {
    const [before] = await tx<{ id: string; bio: string | null }[]>`select id, bio from members where auth_user_id = ${user.id} for update`
    if (!before) return null
    await tx`update members set bio = ${bio || null}, updated_at = now() where id = ${before.id}`
    await audit(tx, user, 'member.bio', 'members', before.id, { bio: before.bio }, { bio: bio || null })
    return { id: before.id, bio: bio || null }
  })
  if (!saved) return apiError(404, 'No member record is linked to this login yet.', NO_STORE)
  return ok(saved, NO_STORE)
}, 'write')
