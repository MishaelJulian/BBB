// Record a meetup (A2): one request, one transaction. The meetup, its readers (attendance), every reader's books and the
// "make a member" choices are saved together or not at all. Uses the same operations as the single-purpose routes.
import { HttpError } from '../http'
import { addBookToMeetup, createMeetup, makeMember } from '../ops'
import type { Caller } from '../session'
import { titleCaseName, type Tx } from '../writes'
import { linkTranslation } from './books'

export interface RecordBook { title?: string; author?: string; translator?: string; isbn?: string; year?: string | number }
export interface RecordReader { id?: string | null; name?: string; books?: RecordBook[] }
export interface RecordInput { date?: string; venue?: string; presenter?: string; readers?: RecordReader[]; make?: string[] }

const pad = (n: number, w: number) => String(n).padStart(w, '0')

/** A new person gets status guest and the next code for this meetup: "<meetup, 3 digits>-<next suffix, 2 digits>" (max + 1, never a count). */
async function newGuest(tx: Tx, name: string, meetupNumber: number): Promise<string> {
  const prefix = pad(meetupNumber, 3)
  const [r] = await tx<{ max: number | null }[]>`
    select max(substring(member_code from '-(\\d+)$')::int) as max from members where member_code like ${prefix + '-%'}`
  const code = `${prefix}-${pad((r.max ?? 0) + 1, 2)}`
  const [n] = await tx<{ id: string }[]>`
    insert into members (display_name, normalized_name, status, member_code) values (${name}, ${name.toLowerCase()}, 'guest', ${code}) returning id`
  return n.id
}

export async function recordMeetup(tx: Tx, who: Caller, input: RecordInput) {
  const date = input.date?.trim()
  const venue = input.venue?.trim()
  if (!date) throw new HttpError(422, 'The date is required.')
  if (!venue) throw new HttpError(422, 'The venue is required.')
  const presenter = (input.presenter ?? '').trim().slice(0, 60)
  const readers = input.readers ?? []
  if (readers.length > 80) throw new HttpError(422, 'Too many readers in one go.')

  const made = await createMeetup(tx, who, { date, venue })
  const number = made.meetup.number
  const meetupId = made.meetup.id
  if (presenter) await tx`update meetups set presented_by = ${presenter} where id = ${meetupId}`

  const seen = new Set<string>()
  let books = 0, newPeople = 0
  for (const r of readers) {
    let id = r.id ?? null
    let name = (r.name ?? '').trim()
    if (id) {
      const [m] = await tx<{ display_name: string }[]>`select display_name from members where id = ${id}`
      if (!m) throw new HttpError(422, `A reader (${name || id}) no longer exists.`)
      name = m.display_name
    } else {
      if (!name) continue
      name = titleCaseName(name)
      const [m] = await tx<{ id: string }[]>`select id from members where lower(display_name) = lower(${name}) limit 1`
      if (m) id = m.id
      else { id = await newGuest(tx, name, number); newPeople++ }
    }
    if (seen.has(id)) continue
    seen.add(id)
    await tx`insert into meetup_attendance (meetup_id, member_id, status, source) values (${meetupId}, ${id}, 'attended', 'admin')`
    for (const b of r.books ?? []) {
      const title = (b.title ?? '').trim()
      if (!title) continue
      const tr = (b.translator ?? '').trim()
      const full = tr && !/\(tr\./i.test(title) ? `${title} (tr. ${tr})` : title
      const year = b.year === undefined || b.year === '' ? undefined : Number(b.year)
      await addBookToMeetup(tx, who, number, {
        title: full, author: (b.author ?? '').trim() || undefined, member: name,
        publication_year: year && Number.isInteger(year) && year > 0 && year <= 2100 ? year : undefined,
      }, { joinExisting: true })
      const [bk] = await tx<{ id: string; isbn10: string | null; isbn13: string | null }[]>`select id, isbn10, isbn13 from canonical_books where normalized_title = ${full.toLowerCase()} limit 1`
      const isbn = (b.isbn ?? '').replace(/[\s-]/g, '').toUpperCase()
      if (bk && /^(\d{13}|\d{9}[\dX])$/.test(isbn) && !bk.isbn10 && !bk.isbn13) {
        if (isbn.length === 13) await tx`update canonical_books set isbn13 = ${isbn}, updated_at = now() where id = ${bk.id}`
        else await tx`update canonical_books set isbn10 = ${isbn}, updated_at = now() where id = ${bk.id}`
      }
      if (bk && tr) await linkTranslation(tx, bk.id, full)
      books++
    }
  }
  for (const id of new Set(input.make ?? [])) await makeMember(tx, who, id)
  await tx`update meetups set attendance_count = ${seen.size}, updated_at = now() where id = ${meetupId}`
  return { success: true, number, readers: seen.size, books, new_people: newPeople, made_members: (input.make ?? []).length, message: `Meetup #${number} recorded.` }
}
