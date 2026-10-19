import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { memberRoute } from '@/lib/handlers'
import { HttpError, apiError, ok, route } from '@/lib/http'
import { caller } from '@/lib/session'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'private, no-store' }

async function mine(tx: { <T extends object[]>(s: TemplateStringsArray, ...a: unknown[]): Promise<T> }, memberId: string) {
  const items = await tx<{ id: string; title: string; author: string | null; source: string; created_at: string }[]>`
    select id, title, author, source, created_at::text as created_at from wishlist_items where member_id = ${memberId} order by created_at desc, id`
  const [m] = await tx<{ wishlist_public: boolean }[]>`select wishlist_public from members where id = ${memberId}`
  return { public: m?.wishlist_public ?? false, items }
}

// My wishlist and who can see it (private unless I switched it).
export const GET = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', NO_STORE)
  const db = sql()
  const [me] = await db<{ id: string }[]>`select id from members where auth_user_id = ${who.id}`
  if (!me) return apiError(404, 'No member record is linked to this login yet.', NO_STORE)
  return ok(await mine(db as never, me.id), NO_STORE)
})

// Add one book: { title, author? }. The same title and author twice is quietly kept once.
export const POST = memberRoute(async (tx, _who, memberId, _p, body) => {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const author = typeof body.author === 'string' ? body.author.trim() : ''
  if (!title) throw new HttpError(422, 'Enter a title.')
  if (title.length > 300 || author.length > 200) throw new HttpError(422, 'That title or author is too long.')
  await tx`insert into wishlist_items (member_id, title, author) values (${memberId}, ${title}, ${author || null}) on conflict do nothing`
  return mine(tx as never, memberId)
})

// Remove one of mine: { id }.
export const DELETE = memberRoute(async (tx, _who, memberId, _p, body) => {
  const id = typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(422, 'Say which book.')
  await tx`delete from wishlist_items where id = ${id} and member_id = ${memberId}`
  return mine(tx as never, memberId)
})
