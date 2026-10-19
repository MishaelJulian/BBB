// The 7-day trash (table admin_trash, migration 20261021100000). A delete copies the row and what hangs off it into one JSON
// snapshot, removes the live rows, and writes an audit row; a restore puts the rows back in foreign-key order.
import { audit } from '../audit'
import { HttpError } from '../http'
import type { Caller } from '../session'
import type { Tx } from '../writes'

export const TRASH_DAYS = 7

/** Insert order for a meetup. A fixed list, never user input. */
const MEETUP_TABLES = ['meetups', 'meetup_attendance', 'discussions', 'book_mentions', 'quotes', 'discussion_participants', 'resources', 'current_reads', 'recommendations'] as const

async function rows(tx: Tx, table: string, where: ReturnType<Tx>) {
  const [r] = await tx<{ j: unknown[] }[]>`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as j from ${tx(table)} t where ${where}`
  return r.j
}

async function putBack(tx: Tx, snapshot: Record<string, unknown[]>, order: readonly string[]) {
  try {
    for (const t of order) {
      const data = snapshot[t]
      if (data?.length) await tx`insert into ${tx(t)} select * from jsonb_populate_recordset(null::${tx(t)}, ${tx.json(data as never)})`
    }
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === '23503') throw new HttpError(409, 'Something this refers to (a member or a book) was removed after it was deleted, so it cannot be put back as it was.')
    if (code === '23505') throw new HttpError(409, 'Something with the same number or name already exists, so it cannot be put back.')
    throw e
  }
}

export async function trashMeetup(tx: Tx, who: Caller, number: number) {
  const [m] = await tx<{ id: string; title: string | null; date: string | null }[]>`select id, title, date::text as date from meetups where meetup_number = ${number} for update`
  if (!m) throw new HttpError(404, `Meetup #${number} not found`)
  const snap: Record<string, unknown[]> = {}
  const discs = tx`select id from discussions where meetup_id = ${m.id}`
  snap.meetups = await rows(tx, 'meetups', tx`id = ${m.id}`)
  snap.meetup_attendance = await rows(tx, 'meetup_attendance', tx`meetup_id = ${m.id}`)
  snap.discussions = await rows(tx, 'discussions', tx`meetup_id = ${m.id}`)
  snap.book_mentions = await rows(tx, 'book_mentions', tx`discussion_id in (${discs})`)
  snap.quotes = await rows(tx, 'quotes', tx`discussion_id in (${discs})`)
  snap.discussion_participants = await rows(tx, 'discussion_participants', tx`discussion_id in (${discs})`)
  snap.resources = await rows(tx, 'resources', tx`meetup_id = ${m.id}`)
  snap.current_reads = await rows(tx, 'current_reads', tx`meetup_id = ${m.id}`)
  snap.recommendations = await rows(tx, 'recommendations', tx`meetup_id = ${m.id}`)
  await tx`delete from book_mentions where discussion_id in (${discs})`
  await tx`delete from quotes where discussion_id in (${discs})`
  await tx`delete from discussion_participants where discussion_id in (${discs})`
  await tx`delete from discussions where meetup_id = ${m.id}`
  await tx`delete from resources where meetup_id = ${m.id}`
  await tx`delete from current_reads where meetup_id = ${m.id}`
  await tx`delete from recommendations where meetup_id = ${m.id}`
  await tx`delete from meetup_attendance where meetup_id = ${m.id}`
  await tx`delete from meetups where id = ${m.id}`
  const label = `Meetup #${number}`
  const [t] = await tx<{ id: string }[]>`
    insert into admin_trash (kind, key, label, snapshot, deleted_by) values ('meetup', ${String(number)}, ${label}, ${tx.json(snap as never)}, ${who.id}) returning id`
  await audit(tx, who, 'meetup.trash', 'meetups', m.id, { number, title: m.title, date: m.date, trash_id: t.id }, null)
  return { success: true, trash_id: t.id, message: `Meetup #${number} deleted. You have ${TRASH_DAYS} days to restore it.` }
}

async function openTrash(tx: Tx, id: string, kind: 'meetup' | 'book') {
  const [t] = await tx<{ id: string; key: string; label: string; snapshot: Record<string, unknown[]>; expired: boolean; restored_at: string | null }[]>`
    select id, key, label, snapshot, (expires_at < now()) as expired, restored_at::text from admin_trash where id = ${id} and kind = ${kind} for update`
  if (!t) throw new HttpError(404, 'Nothing to restore.')
  if (t.restored_at) throw new HttpError(409, 'Already restored.')
  if (t.expired) throw new HttpError(409, `The ${TRASH_DAYS} days to restore this are over.`)
  return t
}

export async function restoreMeetup(tx: Tx, who: Caller, trashId: string) {
  const t = await openTrash(tx, trashId, 'meetup')
  await putBack(tx, t.snapshot, MEETUP_TABLES)
  await tx`update admin_trash set restored_at = now() where id = ${t.id}`
  await audit(tx, who, 'meetup.restore', 'meetups', (t.snapshot.meetups[0] as { id: string }).id, null, { number: Number(t.key), trash_id: t.id })
  return { success: true, number: Number(t.key), message: `${t.label} restored.` }
}

const BOOK_USERS: [string, string][] = [
  ['discussions', 'canonical_book_id'], ['book_mentions', 'canonical_book_id'], ['quotes', 'canonical_book_id'],
  ['current_reads', 'canonical_book_id'], ['recommendations', 'canonical_book_id'], ['editions', 'work_id'],
]

/** How many rows use a book, by table (for "Blocked while it has discussions"). */
export async function bookUsage(tx: Tx, id: string) {
  const out: Record<string, number> = {}
  for (const [t, col] of BOOK_USERS) {
    const [r] = await tx<{ n: number }[]>`select count(*)::int as n from ${tx(t)} where ${tx(col)} = ${id}`
    out[t] = r.n
  }
  return out
}

export async function trashBook(tx: Tx, who: Caller, id: string) {
  const [b] = await tx<{ id: string; title: string }[]>`select id, title from canonical_books where id = ${id} for update`
  if (!b) throw new HttpError(404, 'Book not found')
  const use = await bookUsage(tx, id)
  if (use.discussions) throw new HttpError(409, `This book has ${use.discussions} discussion${use.discussions === 1 ? '' : 's'}. Remove those from their meetups first, or merge this book into another.`)
  for (const [t, n] of Object.entries(use)) if (n) throw new HttpError(409, `This book is still used by ${n} row${n === 1 ? '' : 's'} in ${t.replace('_', ' ')}.`)
  const snap: Record<string, unknown[]> = {}
  snap.canonical_books = await rows(tx, 'canonical_books', tx`id = ${id}`)
  snap.work_identifiers = await rows(tx, 'work_identifiers', tx`work_id = ${id}`)
  snap.book_relations = await rows(tx, 'book_relations', tx`source_book_id = ${id} or target_book_id = ${id}`)
  snap.possible_duplicates = await rows(tx, 'possible_duplicates', tx`candidate_canonical_id = ${id}`)
  const imp = await tx<{ id: string }[]>`select id from imported_books where canonical_book_id = ${id}`
  snap.imported_book_ids = imp.map((r) => r.id)
  await tx`delete from work_identifiers where work_id = ${id}`
  await tx`delete from book_relations where source_book_id = ${id} or target_book_id = ${id}`
  await tx`delete from possible_duplicates where candidate_canonical_id = ${id}`
  await tx`update imported_books set canonical_book_id = null where canonical_book_id = ${id}`
  await tx`delete from canonical_books where id = ${id}`
  const [t] = await tx<{ id: string }[]>`
    insert into admin_trash (kind, key, label, snapshot, deleted_by) values ('book', ${id}, ${b.title}, ${tx.json(snap as never)}, ${who.id}) returning id`
  await audit(tx, who, 'book.trash', 'canonical_books', id, { title: b.title, trash_id: t.id }, null)
  return { success: true, trash_id: t.id, message: `'${b.title}' deleted. You have ${TRASH_DAYS} days to restore it.` }
}

export async function restoreBook(tx: Tx, who: Caller, trashId: string) {
  const t = await openTrash(tx, trashId, 'book')
  await putBack(tx, t.snapshot, ['canonical_books', 'work_identifiers', 'book_relations', 'possible_duplicates'])
  const ids = (t.snapshot.imported_book_ids ?? []) as string[]
  if (ids.length) await tx`update imported_books set canonical_book_id = ${t.key} where id in ${tx(ids)} and canonical_book_id is null`
  await tx`update admin_trash set restored_at = now() where id = ${t.id}`
  await audit(tx, who, 'book.restore', 'canonical_books', t.key, null, { title: t.label, trash_id: t.id })
  return { success: true, id: t.key, message: `'${t.label}' restored.` }
}

/** Open (restorable) trash entries of one kind, newest first. */
export async function listTrash(tx: Tx, kind: 'meetup' | 'book') {
  return tx<{ id: string; key: string; label: string; deleted_at: string; expires_at: string }[]>`
    select id, key, label, deleted_at::text, expires_at::text from admin_trash
    where kind = ${kind} and restored_at is null and expires_at > now() order by deleted_at desc`
}
