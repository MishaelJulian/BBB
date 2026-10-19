import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, route } from '@/lib/http'
import { caller } from '@/lib/session'

export const dynamic = 'force-dynamic'

// "Download my data": everything the club holds about the signed-in member, as one JSON file. Found by the login, never by an id in the request.
export const GET = route(async (req: NextRequest) => {
  const who = await caller(req)
  if (!who) return apiError(401, 'Sign in to continue.', { 'Cache-Control': 'private, no-store' })
  const db = sql()
  const [m] = await db<{ id: string; display_name: string; member_code: string | null; status: string; bio: string | null; wishlist_public: boolean; created_at: string }[]>`
    select id, display_name, member_code, status, bio, wishlist_public, created_at::text as created_at from members where auth_user_id = ${who.id}`
  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    note: 'Everything the Bangalore Book Club holds about this account. Meetup attendance and discussions are the club history under your name.',
    sign_in: { email: who.email },
    linked_record: null,
  }
  if (m) {
    const [entries, attendance, wishlist, picks] = await Promise.all([
      db`select m.meetup_number, m.date::text as date, b.title, a.full_name as author, d.notes
         from discussions d join meetups m on m.id = d.meetup_id left join canonical_books b on b.id = d.canonical_book_id left join authors a on a.id = b.author_id
         where d.member_id = ${m.id} order by m.meetup_number desc, d.ctid`,
      db`select t.meetup_number, t.date::text as date, a.status from meetup_attendance a join meetups t on t.id = a.meetup_id where a.member_id = ${m.id} order by t.meetup_number desc`,
      db`select title, author, source, created_at::text as added from wishlist_items where member_id = ${m.id} order by created_at desc`,
      db`select b.title, a.full_name as author, p.tag, p.created_at::text as picked from member_picks p join canonical_books b on b.id = p.book_id left join authors a on a.id = b.author_id where p.member_id = ${m.id} order by p.created_at`,
    ])
    data.linked_record = { name: m.display_name, member_code: m.member_code, status: m.status, record_created: m.created_at }
    data.bio = m.bio
    data.wishlist_public = m.wishlist_public
    data.entries = entries
    data.meetups_attended = attendance
    data.wishlist = wishlist
    data.closet_picks = picks
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bbb-my-data.json"',
      'Cache-Control': 'private, no-store',
    },
  })
})
