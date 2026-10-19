import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { memberRoute } from '@/lib/handlers'
import { HttpError, apiError, ok, route } from '@/lib/http'
import { caller } from '@/lib/session'
import { MAX_PICKS, isTag, listPicks } from '@/lib/member/picks'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * My picks. With ?book=ID: how many OTHER members also picked that book (a count, never names for a member),
 * my own tag for it, and, for an admin only, the readers' names.
 */
export const GET = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const db = sql()
  const [me] = await db<{ id: string }[]>`select id from members where auth_user_id = ${who.id}`
  if (!me) return apiError(404, 'No member record is linked to this login yet.', NO_STORE)
  const bookId = req.nextUrl.searchParams.get('book')
  if (bookId) {
    const [mine] = await db<{ tag: string }[]>`select tag from member_picks where member_id = ${me.id} and book_id = ${bookId}`
    const [c] = await db<{ n: number }[]>`select count(*)::int as n from member_picks where book_id = ${bookId} and member_id <> ${me.id}`
    const out: Record<string, unknown> = { book_id: bookId, mine: mine?.tag ?? null, others: c.n }
    if (who.role === 'admin') {
      out.readers = await db`
        select m.id, m.display_name, p.tag, p.created_at::text as created_at
        from member_picks p join members m on m.id = p.member_id where p.book_id = ${bookId} order by p.created_at`
    }
    return ok(out, NO_STORE)
  }
  return ok({ max: MAX_PICKS, picks: await listPicks(db, me.id) }, NO_STORE)
})

/**
 * Add a pick, change its tag (same book again), or replace one when the member already has four:
 * { book_id, tag, replace_book_id? }. The member row is locked, so two taps cannot slip a fifth pick in.
 */
export const POST = memberRoute(async (tx, _who, memberId, _p, body) => {
  const bookId = typeof body.book_id === 'string' ? body.book_id : ''
  if (!bookId) throw new HttpError(422, 'Say which book.')
  if (!isTag(body.tag)) throw new HttpError(422, 'Choose Favourite or Want to read.')
  const replace = typeof body.replace_book_id === 'string' && body.replace_book_id ? body.replace_book_id : null
  const [m] = await tx<{ display_name: string }[]>`select display_name from members where id = ${memberId} for update`
  const [book] = await tx<{ title: string }[]>`select title from canonical_books where id = ${bookId}`
  if (!book) throw new HttpError(404, 'That book is not in the archive.')
  const log = (action: string, id: string, title: string, tag: string | null) =>
    tx`insert into pick_log (member_id, member_name, action, book_id, book_title, tag) values (${memberId}, ${m.display_name}, ${action}, ${id}, ${title}, ${tag})`

  const [existing] = await tx<{ tag: string }[]>`select tag from member_picks where member_id = ${memberId} and book_id = ${bookId}`
  if (existing) {
    if (existing.tag !== body.tag) {
      await tx`update member_picks set tag = ${body.tag} where member_id = ${memberId} and book_id = ${bookId}`
      await log('retagged', bookId, book.title, body.tag)
    }
    return { max: MAX_PICKS, picks: await listPicks(tx, memberId) }
  }
  const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from member_picks where member_id = ${memberId}`
  if (n >= MAX_PICKS) {
    if (!replace) throw new HttpError(409, 'You already have four picks. Choose one to replace.')
    const [gone] = await tx<{ title: string }[]>`
      delete from member_picks p using canonical_books b where p.member_id = ${memberId} and p.book_id = ${replace} and b.id = p.book_id returning b.title`
    if (!gone) throw new HttpError(422, 'The pick to replace is not one of yours.')
    await log('removed', replace, gone.title, null)
  }
  await tx`insert into member_picks (member_id, book_id, tag) values (${memberId}, ${bookId}, ${body.tag})`
  await log('added', bookId, book.title, body.tag)
  return { max: MAX_PICKS, picks: await listPicks(tx, memberId) }
})

/** Remove one of my picks: { book_id }. */
export const DELETE = memberRoute(async (tx, _who, memberId, _p, body) => {
  const bookId = typeof body.book_id === 'string' ? body.book_id : ''
  if (!bookId) throw new HttpError(422, 'Say which book.')
  const [m] = await tx<{ display_name: string }[]>`select display_name from members where id = ${memberId} for update`
  const [gone] = await tx<{ title: string }[]>`
    delete from member_picks p using canonical_books b where p.member_id = ${memberId} and p.book_id = ${bookId} and b.id = p.book_id returning b.title`
  if (gone) await tx`insert into pick_log (member_id, member_name, action, book_id, book_title) values (${memberId}, ${m.display_name}, 'removed', ${bookId}, ${gone.title})`
  return { max: MAX_PICKS, picks: await listPicks(tx, memberId) }
})
