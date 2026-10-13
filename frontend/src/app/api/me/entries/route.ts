import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { memberRoute } from '@/lib/handlers'
import { HttpError, apiError, ok, route } from '@/lib/http'
import { addBookToMeetup } from '@/lib/ops'
import { caller } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// My entries (the books I brought), plus the meetup numbers I can add to.
export const GET = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const db = sql()
  const [me] = await db<{ id: string }[]>`select id from members where auth_user_id = ${who.id}`
  if (!me) return apiError(404, 'No member record is linked to this login yet.', NO_STORE)
  const entries = await db`
    select d.id, m.meetup_number, m.date::text as date, b.title, a.full_name as author, d.notes
    from discussions d join meetups m on m.id = d.meetup_id join canonical_books b on b.id = d.canonical_book_id
    left join authors a on a.id = b.author_id
    where d.member_id = ${me.id} order by m.meetup_number desc, d.ctid`
  const meetups = await db`select meetup_number, date::text as date, title from meetups order by meetup_number desc`
  return ok({ entries, meetups }, NO_STORE)
})

// Add a book I brought to a meetup. Joining a book already on the list is fine; the entry is mine only.
export const POST = memberRoute((tx, who, memberId, _p, body) => {
  const n = typeof body.meetup_number === 'number' ? body.meetup_number : NaN
  if (!Number.isInteger(n)) throw new HttpError(422, 'Pick a meetup.')
  const { title, author, notes, url } = body
  return addBookToMeetup(tx, who, n, { title, author, notes, url }, { forceMemberId: memberId, joinExisting: true })
})
