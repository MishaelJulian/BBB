import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1' // next to the Supabase project (ap-south-1)

// Default taken: include_hidden is ignored here. The Python API honoured it for anyone; it returns once an admin role exists.
export const GET = route(async (req: NextRequest) => {
  const search = req.nextUrl.searchParams.get('search')
  const sortBy = req.nextUrl.searchParams.get('sort_by') ?? 'books'
  const db = sql()
  const members = await db<{ id: string; display_name: string }[]>`
    select id, display_name from members
    where is_hidden is not true ${search ? db`and display_name ilike ${'%' + search + '%'}` : db``}
    order by ctid`
  if (members.length === 0) return ok([])

  const discs = await db<{ member_id: string; book_id: string | null; meetup_id: string | null; date: string | null }[]>`
    select d.member_id, d.canonical_book_id as book_id, d.meetup_id, mt.date::text as date
    from discussions d left join meetups mt on mt.id = d.meetup_id
    where d.member_id in ${db(members.map((m) => m.id))}
    order by coalesce(mt.meetup_number, 0) desc, coalesce(mt.date::text, '') desc, d.ctid`

  const memberBooks = new Map<string, string[]>(), memberMeetups = new Map<string, Set<string>>()
  const needed = new Set<string>(), meetupDate = new Map<string, string>()
  for (const r of discs) {
    if (r.book_id) {
      const arr = memberBooks.get(r.member_id) ?? memberBooks.set(r.member_id, []).get(r.member_id)!
      if (!arr.includes(r.book_id)) arr.push(r.book_id)
      if (arr.length <= 8) needed.add(r.book_id)
    }
    if (r.meetup_id) {
      ;(memberMeetups.get(r.member_id) ?? memberMeetups.set(r.member_id, new Set()).get(r.member_id)!).add(r.meetup_id)
      if (r.date && !meetupDate.has(r.meetup_id)) meetupDate.set(r.meetup_id, r.date)
    }
  }
  const covers = new Map<string, string>()
  if (needed.size) {
    const rows = await db<{ id: string; c: string | null }[]>`select id, coalesce(cover_url, thumbnail_url) as c from canonical_books where id in ${db([...needed])}`
    for (const b of rows) if (b.c) covers.set(b.id, b.c)
  }

  const results = members.map((m) => {
    const bookIds = memberBooks.get(m.id) ?? []
    const mIds = memberMeetups.get(m.id) ?? new Set<string>()
    const dates = [...mIds].map((id) => meetupDate.get(id)).filter((d): d is string => !!d).sort()
    const sample: string[] = []
    for (const id of bookIds) {
      const c = covers.get(id)
      if (c && !sample.includes(c)) sample.push(c)
      if (sample.length >= 4) break
    }
    return {
      id: m.id, display_name: m.display_name, is_hidden: false, book_count: bookIds.length, meetup_count: mIds.size,
      first_active_date: dates[0] ?? null, last_active_date: dates[dates.length - 1] ?? null, covers: sample,
    }
  })
  // Array.sort is stable, so ties keep the created_at order, like the Python sort did.
  const text = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  if (sortBy === 'name') results.sort((a, b) => text(a.display_name.toLowerCase(), b.display_name.toLowerCase()))
  else if (sortBy === 'meetups') results.sort((a, b) => b.meetup_count - a.meetup_count || b.book_count - a.book_count)
  else if (sortBy === 'recent') results.sort((a, b) => text(b.last_active_date ?? '', a.last_active_date ?? '') || b.book_count - a.book_count)
  else results.sort((a, b) => b.book_count - a.book_count || b.meetup_count - a.meetup_count)
  return ok(results, search ? undefined : publicCache())
})
