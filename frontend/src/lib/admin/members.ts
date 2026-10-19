// Members tool and Codes tool (reads and the few writes that do not already exist in lib/ops.ts).
import { audit } from '../audit'
import { HttpError } from '../http'
import type { Caller } from '../session'
import { titleCaseName, type Tx } from '../writes'

export interface MemberRow { id: string; name: string; status: string; code: string | null; hidden: boolean; linked: boolean; books: number; meetups: number }
export interface RemovedRow { id: string; name: string; removed_at: string; books: number }

export async function listMembers(tx: Tx) {
  const members = await tx<MemberRow[]>`
    select m.id, m.display_name as name, m.status, m.member_code as code, m.is_hidden as hidden, (m.auth_user_id is not null) as linked,
      (select count(distinct d.canonical_book_id) from discussions d where d.member_id = m.id)::int as books,
      (select count(*) from meetup_attendance a where a.member_id = m.id)::int as meetups
    from members m order by lower(m.display_name)`
  const removed = await tx<{ id: string; name: string; removed_at: string; snap: string | null }[]>`
    select id, display_name as name, removed_at::text, discussions_snapshot as snap from removed_members_archive order by removed_at desc`
  return {
    members,
    removed: removed.map((r): RemovedRow => ({ id: r.id, name: r.name, removed_at: r.removed_at, books: r.snap ? (JSON.parse(r.snap) as unknown[]).length : 0 })),
  }
}

export async function renameMember(tx: Tx, who: Caller, id: string, raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) throw new HttpError(422, 'A name is required.')
  const name = titleCaseName(raw)
  if (name.length > 120) throw new HttpError(422, 'That name is too long.')
  const [m] = await tx<{ display_name: string }[]>`select display_name from members where id = ${id} for update`
  if (!m) throw new HttpError(404, 'Member not found')
  if (m.display_name === name) return { success: true, id, display_name: name, message: 'Nothing changed.' }
  const [clash] = await tx`select 1 from members where normalized_name = ${name.toLowerCase()} and id <> ${id}`
  if (clash) throw new HttpError(409, `Someone else is already called ${name}.`)
  await tx`update members set display_name = ${name}, normalized_name = ${name.toLowerCase()}, updated_at = now() where id = ${id}`
  await audit(tx, who, 'member.rename', 'members', id, { display_name: m.display_name }, { display_name: name })
  return { success: true, id, display_name: name, message: `Renamed to ${name}.` }
}

// ---------------------------------------------------------------- codes

import { revokeResetCode } from '../recovery/codes'

export type CodeStatus = 'Active' | 'Used' | 'Expired' | 'Revoked'
export interface CodeRow { id: string; member_id: string; member: string; by: string | null; issued_at: string; expires_at: string; status: CodeStatus; kind: 'claim' | 'reset' }

export async function listCodes(tx: Tx): Promise<CodeRow[]> {
  const claims = await tx<CodeRow[]>`
    select i.id::text, i.member_id, m.display_name as member,
      (select a.actor_email from audit_log a where a.actor = i.created_by and a.actor_email is not null order by a.at desc limit 1) as by,
      i.created_at::text as issued_at, i.expires_at::text as expires_at,
      case when i.used_at is not null then 'Used' when i.revoked_at is not null then 'Revoked' when i.expires_at <= now() then 'Expired' else 'Active' end as status,
      'claim' as kind
    from member_invites i join members m on m.id = i.member_id order by i.created_at desc limit 500`
  // Reset codes (Slice D) live in their own table; the list is one combined list. Tolerates the table not existing yet.
  const resets = await tx.savepoint((sp) => sp<CodeRow[]>`
    select r.id, r.member_id, m.display_name as member,
      (select a.actor_email from audit_log a where a.actor::text = r.created_by and a.actor_email is not null order by a.at desc limit 1) as by,
      to_timestamp(r.created_at)::text as issued_at, to_timestamp(r.expires_at)::text as expires_at,
      case when r.used_at is not null then 'Used' when r.revoked_at is not null then 'Revoked' when r.expires_at <= extract(epoch from now()) then 'Expired' else 'Active' end as status,
      'reset' as kind
    from reset_codes r join members m on m.id = r.member_id order by r.created_at desc limit 500`).catch((e) => {
    if ((e as { code?: string }).code === '42P01') return [] as CodeRow[]
    throw e
  })
  return [...claims, ...resets].sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1))
}

export async function revokeCode(tx: Tx, who: Caller, id: string) {
  const [i] = await tx<{ member_id: string; used_at: string | null; revoked_at: string | null; expired: boolean }[]>`
    select member_id, used_at::text, revoked_at::text, (expires_at <= now()) as expired from member_invites where id = ${id} for update`
  if (!i) return revokeResetCode(tx, who, id) // not a claim link: a reset code (404 if it is neither)
  if (i.used_at) throw new HttpError(409, 'That code was already used.')
  if (i.revoked_at) throw new HttpError(409, 'That code is already revoked.')
  await tx`update member_invites set revoked_at = now() where id = ${id}`
  await audit(tx, who, 'member.revoke_invite', 'members', i.member_id, null, { invite: id })
  return { success: true, message: 'Code revoked.' }
}

// ---------------------------------------------------------------- remove and restore, without losing attendance

import { deleteMember, restoreMember } from '../ops'

/** The existing remove drops the member's attendance, loop entries and status with them. This keeps a 7-day copy of all of it first. */
export async function removeMemberFull(tx: Tx, who: Caller, id: string) {
  const [m] = await tx<{ id: string; display_name: string; j: unknown }[]>`select id, display_name, to_jsonb(m) as j from members m where id = ${id}`
  if (!m) throw new HttpError(404, 'Member not found')
  const arr = async (q: ReturnType<Tx>) => (await q) as unknown as unknown[]
  const snap = {
    member: m.j,
    attendance: await arr(tx`select to_jsonb(a) as r from meetup_attendance a where member_id = ${id}`),
    current_reads: await arr(tx`select to_jsonb(a) as r from current_reads a where member_id = ${id}`),
    participants: await arr(tx`select to_jsonb(a) as r from discussion_participants a where member_id = ${id}`),
    quote_ids: (await tx<{ id: string }[]>`select id from quotes where member_id = ${id}`).map((r) => r.id),
    recommendation_ids: (await tx<{ id: string }[]>`select id from recommendations where recommender_id = ${id}`).map((r) => r.id),
  }
  const flat = (rows: unknown[]) => rows.map((r) => (r as { r: unknown }).r)
  const out = await deleteMember(tx, who, id)
  await tx`insert into admin_trash (kind, key, label, snapshot, deleted_by) values ('member', ${id}, ${m.display_name},
    ${tx.json({ ...snap, attendance: flat(snap.attendance), current_reads: flat(snap.current_reads), participants: flat(snap.participants) } as never)}, ${who.id})`
  return out
}

/** Restore from the archive (name, bio, books), then everything the trash copy kept: status, code, hidden flag, attendance, and so on. */
export async function restoreMemberFull(tx: Tx, who: Caller, id: string) {
  const out = await restoreMember(tx, who, id)
  const [t] = await tx<{ id: string; snapshot: { member: Record<string, unknown>; attendance: unknown[]; current_reads: unknown[]; participants: unknown[]; quote_ids: string[]; recommendation_ids: string[] } }[]>`
    select id, snapshot from admin_trash where kind = 'member' and key = ${id} and restored_at is null order by deleted_at desc limit 1 for update`
  if (!t) return out
  const s = t.snapshot
  const mm = s.member
  await tx`update members set status = ${String(mm.status)}, member_code = ${(mm.member_code as string | null) ?? null}, is_hidden = ${Boolean(mm.is_hidden)}, auth_user_id = ${(mm.auth_user_id as string | null) ?? null} where id = ${id}`
  if (s.attendance.length) await tx`insert into meetup_attendance select * from jsonb_populate_recordset(null::meetup_attendance, ${tx.json(s.attendance as never)}) r where exists (select 1 from meetups m where m.id = r.meetup_id)`
  if (s.current_reads.length) await tx`insert into current_reads select * from jsonb_populate_recordset(null::current_reads, ${tx.json(s.current_reads as never)}) r where exists (select 1 from meetups m where m.id = r.meetup_id) and exists (select 1 from canonical_books b where b.id = r.canonical_book_id)`
  if (s.participants.length) await tx`insert into discussion_participants select * from jsonb_populate_recordset(null::discussion_participants, ${tx.json(s.participants as never)}) r where exists (select 1 from discussions d where d.id = r.discussion_id)`
  if (s.quote_ids.length) await tx`update quotes set member_id = ${id} where id in ${tx(s.quote_ids)}`
  if (s.recommendation_ids.length) await tx`update recommendations set recommender_id = ${id} where id in ${tx(s.recommendation_ids)}`
  await tx`update admin_trash set restored_at = now() where id = ${t.id}`
  return out
}
