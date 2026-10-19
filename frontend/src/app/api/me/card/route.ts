import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, route } from '@/lib/http'
import { caller } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// The library card: my name, my member code, the first meetup on record and my latest meetups (the stamps).
export const GET = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const db = sql()
  const [m] = await db<{ id: string; display_name: string; member_code: string | null; status: string }[]>`
    select id, display_name, member_code, status from members where auth_user_id = ${who.id}`
  if (!m) return apiError(404, 'No member record is linked to this login yet.', NO_STORE)
  const stamps = await db<{ n: number; d: string }[]>`
    select t.meetup_number n, t.date::text d from meetup_attendance a join meetups t on t.id = a.meetup_id
    where a.member_id = ${m.id} order by t.date desc, t.meetup_number desc`
  return ok({ name: m.display_name, code: m.member_code, status: m.status, first: stamps.length ? stamps[stamps.length - 1].d : null, total: stamps.length, stamps: stamps.slice(0, 2) }, NO_STORE)
})
