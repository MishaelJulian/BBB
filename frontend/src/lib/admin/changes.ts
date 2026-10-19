// "All changes": audit_log rows with a real 7-day Undo wherever the change can be reversed, and the reason where it cannot.
// An undo is a new audited change (action change.undo, after.undid = the original row id); it never edits audit history.
import { audit } from '../audit'
import { HttpError } from '../http'
import { setMemberHidden, toggleGeneral } from '../ops'
import { restoreMemberFull } from './members'
import type { Caller } from '../session'
import type { Tx } from '../writes'
import { restoreBook, restoreMeetup, trashMeetup } from './trash'
import { unmergeBooks } from './books'

export const UNDO_DAYS = 7

export const LABELS: Record<string, string> = {
  'meetup.create': 'Recorded a meetup', 'meetup.update': 'Edited a meetup', 'meetup.delete': 'Deleted a meetup', 'meetup.trash': 'Deleted a meetup',
  'meetup.restore': 'Restored a meetup', 'meetup.add_book': 'Added a book to a meetup', 'meetup.photo': 'Changed a group photo', 'meetup.pdf': 'Made a books PDF',
  'meetup.record': 'Recorded a meetup', 'meetup.enrich': 'Enriched a meetup\'s books',
  'member.visibility': 'Hid or showed a member', 'member.promote': 'Made a member', 'member.delete': 'Removed a member', 'member.restore': 'Restored a member',
  'member.invite': 'Issued a claim code', 'member.reset_code': 'Issued a reset code', 'member.reset_code_revoked': 'Revoked a reset code', 'member.revoke_invite': 'Revoked a code', 'member.rename': 'Renamed a member', 'member.claim': 'Claimed a record', 'member.bio': 'Changed a bio',
  'book.update': 'Edited a book', 'book.edit': 'Edited a book', 'book.trash': 'Deleted a book', 'book.restore': 'Restored a book', 'book.merge': 'Merged two books', 'book.enrich': 'Filled in a book',
  'discussion.delete': 'Removed a book from a meetup', 'discussion.general': 'Changed general discussion', 'entry.add': 'A member added an entry', 'entry.remove': 'A member removed an entry',
  'change.undo': 'Undid a change',
}
export const labelOf = (a: string) => LABELS[a] ?? a

export type ChangeType = 'meetups' | 'members' | 'books' | 'other'
const typeOf = (action: string, table: string | null): ChangeType =>
  table === 'meetups' || action.startsWith('meetup.') || action.startsWith('discussion.') ? 'meetups'
  : table === 'members' || action.startsWith('member.') ? 'members'
  : table === 'canonical_books' || action.startsWith('book.') ? 'books' : 'other'

export interface AuditRow { id: string; at: string; age_days: number; actor: string | null; actor_email: string | null; action: string; table_name: string | null; row_id: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null }
export type UndoState = { state: 'undo' } | { state: 'done'; reason: string } | { state: 'expired'; reason: string } | { state: 'no'; reason: string }
export interface Change { id: string; at: string; actor_email: string | null; action: string; label: string; type: ChangeType; undo: UndoState }

type Plan = { ok: true; run: (tx: Tx, who: Caller) => Promise<unknown> } | { ok: false; reason: string }
const no = (reason: string): Plan => ({ ok: false, reason })
const str = (v: unknown) => (typeof v === 'string' ? v : null)

/** Works out whether a change can be reversed right now, and how. Checks the current state, so an edit made later blocks the undo. */
async function plan(tx: Tx, a: AuditRow): Promise<Plan> {
  const b = a.before ?? {}, f = a.after ?? {}
  switch (a.action) {
    case 'member.visibility': {
      const [m] = await tx<{ is_hidden: boolean }[]>`select is_hidden from members where id = ${a.row_id}`
      if (!m) return no('The member was removed later')
      if (m.is_hidden !== f.is_hidden) return no('Changed again since')
      return { ok: true, run: (t, w) => setMemberHidden(t, w, a.row_id!, Boolean(b.is_hidden)) }
    }
    case 'member.promote': {
      const [m] = await tx<{ status: string }[]>`select status from members where id = ${a.row_id}`
      if (!m) return no('The member was removed later')
      if (m.status !== f.status) return no('Changed again since')
      return { ok: true, run: async (t, w) => { await t`update members set status = ${String(b.status)}, updated_at = now() where id = ${a.row_id}`; await audit(t, w, 'member.promote', 'members', a.row_id!, f, b) } }
    }
    case 'member.rename': {
      const [m] = await tx<{ display_name: string }[]>`select display_name from members where id = ${a.row_id}`
      if (!m) return no('The member was removed later')
      if (m.display_name !== f.display_name) return no('Renamed again since')
      return { ok: true, run: async (t, w) => { await t`update members set display_name = ${String(b.display_name)}, normalized_name = ${String(b.display_name).toLowerCase()}, updated_at = now() where id = ${a.row_id}`; await audit(t, w, 'member.rename', 'members', a.row_id!, f, b) } }
    }
    case 'member.delete': {
      const [r] = await tx`select 1 from removed_members_archive where id = ${a.row_id}`
      return r ? { ok: true, run: (t, w) => restoreMemberFull(t, w, a.row_id!) } : no('The member was already restored')
    }
    case 'member.invite': {
      const r = await tx`select 1 from member_invites where member_id = ${a.row_id} and used_at is null and revoked_at is null and expires_at > now()`
      if (!r.length) return no('The code was used, has expired or was replaced')
      return { ok: true, run: async (t, w) => { await t`update member_invites set revoked_at = now() where member_id = ${a.row_id} and used_at is null and revoked_at is null and expires_at > now()`; await audit(t, w, 'member.revoke_invite', 'members', a.row_id!, null, { by_undo: a.id }) } }
    }
    case 'member.reset_code': {
      const [r] = await tx<{ ok: boolean }[]>`select (used_at is null and revoked_at is null and expires_at > extract(epoch from now())) as ok from reset_codes where id = ${str(f.code_id)}`
      if (!r?.ok) return no('The code was used, has expired or was replaced')
      return { ok: true, run: async (t, w) => { await t`update reset_codes set revoked_at = extract(epoch from now())::bigint where id = ${str(f.code_id)} and used_at is null and revoked_at is null`; await audit(t, w, 'member.reset_code_revoked', 'members', a.row_id!, null, { code_id: str(f.code_id), by_undo: a.id }) } }
    }
    case 'member.reset_code_revoked': return no('Issue a new code instead')
    case 'meetup.update': {
      const [m] = await tx<{ date: string | null; title: string | null; venue_id: string | null }[]>`select date::text as date, title, venue_id from meetups where id = ${a.row_id}`
      if (!m) return no('The meetup was removed later')
      if (m.date !== (f.date ?? null) || m.title !== (f.title ?? null) || m.venue_id !== (f.venue_id ?? null)) return no('Edited again since')
      return { ok: true, run: async (t, w) => { await t`update meetups set date = ${str(b.date)}::date, title = ${str(b.title)}, venue_id = ${str(b.venue_id)}, updated_at = now() where id = ${a.row_id}`; await audit(t, w, 'meetup.update', 'meetups', a.row_id!, f, b) } }
    }
    case 'meetup.create': case 'meetup.record': {
      const [m] = await tx<{ meetup_number: number }[]>`select meetup_number from meetups where id = ${a.row_id}`
      if (!m) return no('What this created was later removed')
      return { ok: true, run: (t, w) => trashMeetup(t, w, m.meetup_number) }
    }
    case 'meetup.trash': case 'book.trash': {
      const [t] = await tx<{ ok: boolean }[]>`select (restored_at is null and expires_at > now()) as ok from admin_trash where id = ${str(b.trash_id)}`
      if (!t?.ok) return no('Already restored, or the copy has expired')
      return { ok: true, run: (tt, w) => (a.action === 'meetup.trash' ? restoreMeetup(tt, w, String(b.trash_id)) : restoreBook(tt, w, String(b.trash_id))) }
    }
    case 'meetup.photo': {
      const [m] = await tx<{ photo_url: string | null }[]>`select photo_url from meetups where id = ${a.row_id}`
      if (!m) return no('The meetup was removed later')
      if (m.photo_url !== (f.photo_url ?? null)) return no('The photo was changed again since')
      return { ok: true, run: async (t, w) => { await t`update meetups set photo_url = ${str(b.photo_url)}, updated_at = now() where id = ${a.row_id}`; await audit(t, w, 'meetup.photo', 'meetups', a.row_id!, f, b) } }
    }
    case 'meetup.pdf': {
      const [m] = await tx<{ pdf_url: string | null }[]>`select pdf_url from meetups where id = ${a.row_id}`
      if (!m) return no('The meetup was removed later')
      if (m.pdf_url !== (f.pdf_url ?? null)) return no('The PDF was changed again since')
      return { ok: true, run: async (t, w) => { await t`update meetups set pdf_url = ${str(b.pdf_url)}, updated_at = now() where id = ${a.row_id}`; await audit(t, w, 'meetup.pdf', 'meetups', a.row_id!, f, { pdf_url: b.pdf_url ?? null }) } }
    }
    case 'book.edit': {
      const [bk] = await tx<Record<string, unknown>[]>`select title, author_id, publisher_id, publication_year, isbn10, isbn13, cover_url, thumbnail_url, description from canonical_books where id = ${a.row_id}`
      if (!bk) return no('The book was removed later')
      for (const k of Object.keys(f)) if (k !== 'translator' && (bk[k] ?? null) !== (f[k] ?? null)) return no('Edited again since')
      return { ok: true, run: async (t, w) => {
        await t`update canonical_books set title = ${String(b.title ?? bk.title)}, normalized_title = ${String(b.title ?? bk.title).toLowerCase()}, author_id = ${str(b.author_id)}, publisher_id = ${str(b.publisher_id)},
          publication_year = ${(b.publication_year as number | null) ?? null}::int, isbn10 = ${str(b.isbn10)}, isbn13 = ${str(b.isbn13)}, cover_url = ${str(b.cover_url)}, thumbnail_url = ${str(b.thumbnail_url)}, description = ${str(b.description)}, updated_at = now() where id = ${a.row_id}`
        await audit(t, w, 'book.edit', 'canonical_books', a.row_id!, f, b)
      } }
    }
    case 'book.update': {
      const [bk] = await tx<{ title: string; author_id: string | null }[]>`select title, author_id from canonical_books where id = ${a.row_id}`
      if (!bk) return no('The book was removed later')
      if (bk.title !== f.title || bk.author_id !== (f.author_id ?? null)) return no('Edited again since')
      return { ok: true, run: async (t, w) => { await t`update canonical_books set title = ${String(b.title)}, normalized_title = ${String(b.title).toLowerCase()}, author_id = ${str(b.author_id)}, updated_at = now() where id = ${a.row_id}`; await audit(t, w, 'book.update', 'canonical_books', a.row_id!, f, b) } }
    }
    case 'book.merge': {
      const [r] = await tx<{ n: number }[]>`select count(*)::int as n from canonical_books where id = ${str(f.target_id)}`
      if (!r?.n) return no('The book it was merged into was removed later')
      const [s] = await tx<{ n: number }[]>`select count(*)::int as n from canonical_books where id = ${a.row_id}`
      if (s?.n) return no('Already undone')
      return { ok: true, run: (t, w) => unmergeBooks(t, w, a) }
    }
    case 'discussion.general': {
      const [d] = await tx`select 1 from discussions where id = ${a.row_id}`
      if (!d) return no('The entry was removed later')
      return { ok: true, run: (t, w) => toggleGeneral(t, w, a.row_id!, !f.is_general_discussion) }
    }
    case 'meetup.delete': return no('Deleted before the 7-day copy existed')
    case 'discussion.delete': return no('The removed entries were not saved')
    case 'meetup.add_book': return no('Use Remove on the meetup page')
    case 'entry.add': case 'entry.remove': case 'member.bio': case 'member.claim': return no('A member made this change, not an admin')
    case 'member.restore': return no('Remove the member again if that is what you want')
    case 'member.revoke_invite': return no('Make a new code instead')
    case 'change.undo': return no('An undo is not itself undone')
    default: return no('This kind of change cannot be reversed')
  }
}

const SELECT_AUDIT = (tx: Tx) => tx`
  select id::text, at::text as at, extract(epoch from (now() - at)) / 86400 as age_days, actor::text, actor_email, action, table_name, row_id, before, after from audit_log`

export async function listChanges(tx: Tx, opts: { email?: string | null; limit?: number; offset?: number; type?: ChangeType | 'all'; q?: string }) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)
  const raw = await tx<AuditRow[]>`
    ${SELECT_AUDIT(tx)}
    where action not like 'auth.%' and ${opts.email ? tx`actor_email = ${opts.email}` : tx`true`}
    order by at desc, id desc limit ${limit * 3} offset ${opts.offset ?? 0}`
  const undone = new Set((await tx<{ u: string }[]>`select after->>'undid' as u from audit_log where action = 'change.undo' and at > now() - interval '8 days'`).map((r) => r.u))
  const q = opts.q?.trim().toLowerCase()
  const out: Change[] = []
  for (const a of raw) {
    const type = typeOf(a.action, a.table_name)
    const label = labelOf(a.action)
    if (opts.type && opts.type !== 'all' && type !== opts.type) continue
    if (q && !`${label} ${a.actor_email ?? ''} ${a.at.slice(0, 10)}`.toLowerCase().includes(q)) continue
    let undo: UndoState
    if (undone.has(a.id)) undo = { state: 'done', reason: 'Undone' }
    else if (a.age_days > UNDO_DAYS) undo = { state: 'expired', reason: 'The 7 days are over' }
    else {
      const p = await plan(tx, a)
      undo = p.ok ? { state: 'undo' } : { state: 'no', reason: p.reason }
    }
    out.push({ id: a.id, at: a.at, actor_email: a.actor_email, action: a.action, label, type, undo })
    if (out.length >= limit) break
  }
  const [c] = await tx<{ n: number }[]>`select count(*)::int as n from audit_log`
  return { total: c.n, changes: out }
}

export async function undoChange(tx: Tx, who: Caller, id: string) {
  const [a] = await tx<AuditRow[]>`${SELECT_AUDIT(tx)} where id = ${id} for update`
  if (!a) throw new HttpError(404, 'That change was not found.')
  const [dup] = await tx`select 1 from audit_log where action = 'change.undo' and after->>'undid' = ${a.id}`
  if (dup) throw new HttpError(409, 'That change was already undone.')
  if (a.age_days > UNDO_DAYS) throw new HttpError(409, 'The 7 days to undo this are over.')
  const p = await plan(tx, a)
  if (!p.ok) throw new HttpError(409, `This cannot be undone: ${p.reason}.`)
  await p.run(tx, who)
  await audit(tx, who, 'change.undo', a.table_name ?? 'audit_log', a.row_id ?? a.id, null, { undid: a.id, action: a.action })
  return { success: true, message: `Undone: ${labelOf(a.action)}.` }
}
