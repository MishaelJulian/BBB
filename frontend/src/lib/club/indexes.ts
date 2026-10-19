import { unstable_cache } from 'next/cache'
import { sql } from '@/lib/db'

/** One row per meetup for the Meetups list: counts, format, the books and the readers (names) for search. */
export interface MeetupIndexRow {
  n: number
  d: string
  v: string
  f: 'I' | 'O'
  b: number
  r: number
  bk: [string, string][]
  rd: string[]
}
/** One row per public reader for the Readers list. */
export interface ReaderIndexRow {
  id: string
  n: string
  b: number
  m: number
  f: string | null
  l: string | null
}

async function meetups(): Promise<MeetupIndexRow[]> {
  const rows = await sql()<(Omit<MeetupIndexRow, 'f'> & { format: string })[]>`
    select t.meetup_number n, t.date::text d, coalesce(v.name, '') v, t.format,
      (select count(distinct d.canonical_book_id) from discussions d where d.meetup_id = t.id)::int b,
      (select count(*) from meetup_attendance a where a.meetup_id = t.id)::int r,
      (select coalesce(json_agg(json_build_array(bk.title, coalesce(au.full_name, ''))), '[]')
         from (select distinct d.canonical_book_id from discussions d where d.meetup_id = t.id) z
         join canonical_books bk on bk.id = z.canonical_book_id left join authors au on au.id = bk.author_id) bk,
      (select coalesce(json_agg(mm.display_name order by mm.display_name), '[]')
         from meetup_attendance a join members mm on mm.id = a.member_id where a.meetup_id = t.id and not mm.is_hidden) rd
    from meetups t left join venues v on v.id = t.venue_id order by t.meetup_number`
  return rows.map(({ format, ...r }) => ({ ...r, f: format === 'ONLINE' ? 'O' : 'I' }))
}

async function readers(): Promise<ReaderIndexRow[]> {
  return sql()<ReaderIndexRow[]>`
    select m.id, m.display_name n,
      (select count(distinct d.canonical_book_id) from discussions d where d.member_id = m.id)::int b,
      (select count(*) from meetup_attendance a where a.member_id = m.id)::int m,
      (select min(t.date)::text from meetup_attendance a join meetups t on t.id = a.meetup_id where a.member_id = m.id) f,
      (select max(t.date)::text from meetup_attendance a join meetups t on t.id = a.meetup_id where a.member_id = m.id) l
    from members m where not m.is_hidden order by m.display_name`
}

// One hour, like the rest of the archive pages; the daily cron and admin edits can bump it later.
export const getMeetupIndex = unstable_cache(meetups, ['club-meetup-index'], { revalidate: 3600 })
export const getReaderIndex = unstable_cache(readers, ['club-reader-index'], { revalidate: 3600 })
