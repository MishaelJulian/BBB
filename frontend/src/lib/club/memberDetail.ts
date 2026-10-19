import { sql } from '@/lib/db'

interface MeetupRef { meetup_number: number | null; date: string | null; venue: string | null }

// By id, else by display name (case-insensitive). Default taken: a hidden member is a 404 for the public.
/** A public member with the books they brought and the meetups they were at; null when unknown or hidden (a hidden member is a 404 for the public). */
export async function getMemberDetail(id: string) {
  const db = sql()
  type M = { id: string; display_name: string; bio: string | null; is_hidden: boolean }
  let [member] = await db<M[]>`select id, display_name, bio, is_hidden from members where id = ${id}`
  if (!member) [member] = await db<M[]>`select id, display_name, bio, is_hidden from members where display_name ilike ${id} limit 1`
  if (!member || member.is_hidden) return null

  const discs = await db<{ meetup_id: string | null; book_id: string | null }[]>`
    select meetup_id, canonical_book_id as book_id from discussions where member_id = ${member.id} order by ctid`
  const meetupIds = [...new Set(discs.map((d) => d.meetup_id).filter((v): v is string => !!v))]
  const bookIds = [...new Set(discs.map((d) => d.book_id).filter((v): v is string => !!v))]
  const meetupRows = meetupIds.length
    ? await db<{ id: string; number: number; date: string | null; venue: string | null }[]>`
        select m.id, m.meetup_number as number, m.date::text as date, v.name as venue
        from meetups m left join venues v on v.id = m.venue_id where m.id in ${db(meetupIds)}` : []
  const bookRows = bookIds.length
    ? await db<{ id: string; title: string; author_id: string | null; author_name: string | null; cover_url: string | null; thumbnail_url: string | null }[]>`
        select b.id, b.title, b.author_id, a.full_name as author_name, b.cover_url, b.thumbnail_url
        from canonical_books b left join authors a on a.id = b.author_id where b.id in ${db(bookIds)}` : []
  const meetupById = new Map(meetupRows.map((m) => [m.id, m]))
  const bookById = new Map(bookRows.map((b) => [b.id, b]))

  const meetupsMap = new Map<string, { id: string; number: number; date: string | null; venue: string | null }>()
  const booksMap = new Map<string, { id: string; title: string; author_id: string | null; author_name: string | null; cover_url: string | null; thumbnail_url: string | null; meetups: MeetupRef[] }>()
  for (const d of discs) {
    const mt = d.meetup_id ? meetupById.get(d.meetup_id) : undefined
    if (mt && !meetupsMap.has(mt.id)) meetupsMap.set(mt.id, { id: mt.id, number: mt.number, date: mt.date, venue: mt.venue })
    const b = d.book_id ? bookById.get(d.book_id) : undefined
    if (b) {
      if (!booksMap.has(b.id)) booksMap.set(b.id, { id: b.id, title: b.title, author_id: b.author_id, author_name: b.author_name, cover_url: b.cover_url, thumbnail_url: b.thumbnail_url, meetups: [] })
      if (mt) booksMap.get(b.id)!.meetups.push({ meetup_number: mt.number, date: mt.date, venue: mt.venue })
    }
  }
  const text = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  const byRecent = (a: MeetupRef, b: MeetupRef) => (b.meetup_number ?? 0) - (a.meetup_number ?? 0) || text(b.date ?? '', a.date ?? '')
  const meetupList = [...meetupsMap.values()].sort((a, b) => (b.number || 0) - (a.number || 0))
  const dates = meetupList.map((m) => m.date).filter((d): d is string => !!d).sort()

  const books = [...booksMap.values()]
  for (const b of books) {
    const seen = new Set<string>()
    b.meetups = b.meetups.filter((m) => { const k = `${m.meetup_number}|${m.date}`; return seen.has(k) ? false : (seen.add(k), true) }).sort(byRecent)
  }
  const key = (b: { meetups: MeetupRef[] }) => ({
    n: Math.max(0, ...b.meetups.map((m) => m.meetup_number).filter((n): n is number => n !== null)),
    d: b.meetups.map((m) => m.date).filter((d): d is string => !!d).sort().pop() ?? '',
  })
  books.sort((a, b) => { const ka = key(a), kb = key(b); return kb.n - ka.n || text(kb.d, ka.d) })

  return {
    id: member.id, display_name: member.display_name, bio: member.bio, is_hidden: false,
    book_count: booksMap.size, meetup_count: meetupsMap.size,
    first_active_date: dates[0] ?? null, last_active_date: dates[dates.length - 1] ?? null,
    books, meetups: meetupList,
  }
}
