import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'
import { caller } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Who am I, and which member record (if any) is linked to my login?
export const GET = route(async (req: NextRequest) => {
  const user = await caller(req)
  if (!user) return apiError(401, 'Sign in to continue.', NO_STORE)
  const [member] = await sql()<{ id: string; display_name: string; bio: string | null; status: string }[]>`
    select id, display_name, bio, status from members where auth_user_id = ${user.id}`
  return ok({ user: { id: user.id, email: user.email, role: user.role }, member: member ?? null }, NO_STORE)
})
