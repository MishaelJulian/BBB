// Runs against a THROWAWAY Postgres only (never the live database): every test runs in a transaction that is rolled back.
//   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/bbb npx vitest run src/lib/admin
import postgres, { type TransactionSql } from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setMemberHidden, makeMember } from '../ops'
import type { Caller } from '../session'
import { editBook, mergeBooks, cleanIsbn } from './books'
import { listChanges, undoChange } from './changes'
import { recordMeetup } from './record'
import { renameMember, revokeCode, listCodes, removeMemberFull, restoreMemberFull } from './members'
import { trashBook, trashMeetup, restoreMeetup, restoreBook } from './trash'
import { overview } from './overview'
import { imageType } from './meetups'

const url = process.env.DATABASE_URL ?? ''
const local = /127\.0\.0\.1|localhost/.test(url)
const db = local ? postgres(url, { max: 2, prepare: false }) : (null as never)
const who: Caller = { id: '11111111-1111-1111-1111-111111111111', email: 'test-admin@bbb.test', role: 'admin' }

class Rollback extends Error {}
async function inTx<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
  let out!: T
  try {
    await db.begin(async (tx) => {
      out = await fn(tx)
      throw new Rollback()
    })
  } catch (e) {
    if (!(e instanceof Rollback)) throw e
  }
  return out
}
const count = async (tx: TransactionSql, table: string) => (await tx.unsafe(`select count(*)::int as n from ${table}`))[0].n as number

describe.skipIf(!local)('admin operations (local database)', () => {
  beforeAll(async () => {
    const [{ n }] = await db`select count(*)::int as n from meetups`
    if (n < 10) throw new Error('the local database has no data')
  })
  afterAll(async () => { await db?.end() })

  it('records a meetup in one transaction, then undoes it from All changes and brings it back', async () => {
    await inTx(async (tx) => {
      const before = { meetups: await count(tx, 'meetups'), members: await count(tx, 'members'), att: await count(tx, 'meetup_attendance'), disc: await count(tx, 'discussions') }
      const [guest] = await tx<{ id: string }[]>`select id from members where status = 'guest' limit 1`
      const [reg] = await tx<{ id: string; display_name: string }[]>`select id, display_name from members where status = 'member' and not is_hidden limit 1`
      const r = await recordMeetup(tx, who, {
        date: '2031-05-04', venue: 'Test Venue', presenter: 'Someone Presenting',
        readers: [
          { id: reg.id, name: reg.display_name, books: [{ title: 'A Brand New Test Book', author: 'Nobody Known', translator: '', isbn: '9780306406157', year: '1999' }] },
          { name: 'zed new person', books: [{ title: 'Another Test Book (tr. Q)' }] },
        ],
        make: [guest.id],
      })
      expect(r.readers).toBe(2)
      expect(r.books).toBe(2)
      expect(r.new_people).toBe(1)
      const [m] = await tx<{ id: string; presented_by: string; attendance_count: number; venue_id: string }[]>`select id, presented_by, attendance_count, venue_id from meetups where meetup_number = ${r.number}`
      expect(m.presented_by).toBe('Someone Presenting')
      expect(m.attendance_count).toBe(2)
      const [g] = await tx<{ status: string; member_code: string }[]>`select status, member_code from members where display_name = 'Zed New Person'`
      expect(g.status).toBe('guest')
      expect(g.member_code).toMatch(new RegExp(`^${String(r.number).padStart(3, '0')}-01$`))
      const [bk] = await tx<{ isbn13: string; publication_year: number }[]>`select isbn13, publication_year from canonical_books where title = 'A Brand New Test Book'`
      expect(bk.isbn13).toBe('9780306406157')
      expect(bk.publication_year).toBe(1999)
      expect((await tx`select 1 from members where id = ${guest.id} and status = 'member'`).length).toBe(1)

      // All changes: the create row can be undone (it moves to the 7-day trash), then that can be undone too.
      const { changes } = await listChanges(tx, { email: who.email, limit: 20 })
      const create = changes.find((c) => c.action === 'meetup.create')!
      expect(create.undo.state).toBe('undo')
      await undoChange(tx, who, create.id)
      expect(await count(tx, 'meetups')).toBe(before.meetups)
      await expect(undoChange(tx, who, create.id)).rejects.toThrow(/already undone/)
      const after = await listChanges(tx, { email: who.email, limit: 20 })
      const trash = after.changes.find((c) => c.action === 'meetup.trash')!
      expect(trash.undo.state).toBe('undo')
      await undoChange(tx, who, trash.id)
      expect(await count(tx, 'meetups')).toBe(before.meetups + 1)
      expect(await count(tx, 'discussions')).toBe(before.disc + 2)
      expect(await count(tx, 'meetup_attendance')).toBe(before.att + 2)
    })
  })

  it('moves a real meetup to the trash and puts every row back', async () => {
    await inTx(async (tx) => {
      const [m] = await tx<{ meetup_number: number }[]>`select meetup_number from meetups m where (select count(*) from discussions d where d.meetup_id = m.id) > 5 and exists (select 1 from meetup_attendance a where a.meetup_id = m.id) order by meetup_number desc limit 1`
      const snap = async () => JSON.stringify([await count(tx, 'discussions'), await count(tx, 'meetup_attendance'), await count(tx, 'meetups'), await count(tx, 'resources')])
      const before = await snap()
      const t = await trashMeetup(tx, who, m.meetup_number)
      expect(await snap()).not.toBe(before)
      expect((await tx`select 1 from meetups where meetup_number = ${m.meetup_number}`).length).toBe(0)
      await restoreMeetup(tx, who, t.trash_id)
      expect(await snap()).toBe(before)
      await expect(restoreMeetup(tx, who, t.trash_id)).rejects.toThrow(/Already restored/)
    })
  })

  it('refuses to restore after the 7 days', async () => {
    await inTx(async (tx) => {
      const [m] = await tx<{ meetup_number: number }[]>`select meetup_number from meetups order by meetup_number desc limit 1`
      const t = await trashMeetup(tx, who, m.meetup_number)
      await tx`update admin_trash set expires_at = now() - interval '1 minute' where id = ${t.trash_id}`
      await expect(restoreMeetup(tx, who, t.trash_id)).rejects.toThrow(/days to restore this are over/)
    })
  })

  it('hides a member and undoes it once; a later change blocks the undo', async () => {
    await inTx(async (tx) => {
      const [m] = await tx<{ id: string }[]>`select id from members where not is_hidden limit 1`
      await setMemberHidden(tx, who, m.id, true)
      const c = (await listChanges(tx, { email: who.email })).changes.find((x) => x.action === 'member.visibility')!
      expect(c.undo.state).toBe('undo')
      await undoChange(tx, who, c.id)
      expect((await tx`select is_hidden from members where id = ${m.id}`)[0].is_hidden).toBe(false)
      // a second hide, then someone shows it again: the first hide's undo must say it was changed again
      await setMemberHidden(tx, who, m.id, true)
      await setMemberHidden(tx, who, m.id, false)
      const all = (await listChanges(tx, { email: who.email })).changes.filter((x) => x.action === 'member.visibility')
      expect(all.some((x) => x.undo.state === 'no' && /again/.test((x.undo as { reason: string }).reason))).toBe(true)
    })
  })

  it('renames and promotes a member with working undo', async () => {
    await inTx(async (tx) => {
      const [g] = await tx<{ id: string; display_name: string }[]>`select id, display_name from members where status = 'guest' limit 1`
      await renameMember(tx, who, g.id, '  newly named person ')
      expect((await tx`select display_name from members where id = ${g.id}`)[0].display_name).toBe('Newly Named Person')
      await makeMember(tx, who, g.id)
      const list = (await listChanges(tx, { email: who.email })).changes
      await undoChange(tx, who, list.find((x) => x.action === 'member.promote')!.id)
      expect((await tx`select status from members where id = ${g.id}`)[0].status).toBe('guest')
      await undoChange(tx, who, list.find((x) => x.action === 'member.rename')!.id)
      expect((await tx`select display_name from members where id = ${g.id}`)[0].display_name).toBe(g.display_name)
      await expect(renameMember(tx, who, g.id, '')).rejects.toThrow(/name is required/)
    })
  })

  it('removes and restores a member without losing status, code or attendance', async () => {
    await inTx(async (tx) => {
      const [m] = await tx<{ id: string; status: string; member_code: string; display_name: string }[]>`select id, status, member_code, display_name from members m where status = 'byob' and exists (select 1 from meetup_attendance a where a.member_id = m.id) limit 1`
      const att = (await tx`select count(*)::int as n from meetup_attendance where member_id = ${m.id}`)[0].n
      const disc = (await tx`select count(*)::int as n from discussions where member_id = ${m.id}`)[0].n
      await removeMemberFull(tx, who, m.id)
      expect((await tx`select 1 from members where id = ${m.id}`).length).toBe(0)
      const c = (await listChanges(tx, { email: who.email })).changes.find((x) => x.action === 'member.delete')!
      expect(c.undo.state).toBe('undo')
      await undoChange(tx, who, c.id)
      const [back] = await tx<{ status: string; member_code: string }[]>`select status, member_code from members where id = ${m.id}`
      expect(back).toEqual({ status: m.status, member_code: m.member_code })
      expect((await tx`select count(*)::int as n from meetup_attendance where member_id = ${m.id}`)[0].n).toBe(att)
      expect((await tx`select count(*)::int as n from discussions where member_id = ${m.id}`)[0].n).toBe(disc)
      await removeMemberFull(tx, who, m.id)
      await restoreMemberFull(tx, who, m.id)
      expect((await tx`select count(*)::int as n from meetup_attendance where member_id = ${m.id}`)[0].n).toBe(att)
    })
  })

  it('edits a book (publisher, year, ISBN, translator) and undoes it', async () => {
    await inTx(async (tx) => {
      const [b] = await tx<{ id: string; title: string; author_id: string | null }[]>`select id, title, author_id from canonical_books where title not like '%(tr.%' and isbn13 is null and isbn10 is null and publication_year is null limit 1`
      await expect(editBook(tx, who, b.id, { isbn: '9780306406158' })).rejects.toThrow(/does not check out/)
      const r = await editBook(tx, who, b.id, { publisher: 'Test Press', publication_year: 2001, isbn: '978-0-306-40615-7', translator: 'T. Ranslator', description: 'Hello' })
      expect(r.changed).toEqual(expect.arrayContaining(['title', 'publisher_id', 'publication_year', 'isbn13', 'description']))
      const [now] = await tx<{ title: string; isbn13: string; p: string }[]>`select title, isbn13, (select name from publishers where id = publisher_id) as p from canonical_books where id = ${b.id}`
      expect(now.title).toBe(`${b.title} (tr. T. Ranslator)`)
      expect(now.isbn13).toBe('9780306406157')
      expect(now.p).toBe('Test Press')
      const c = (await listChanges(tx, { email: who.email })).changes.find((x) => x.action === 'book.edit')!
      expect(c.undo.state).toBe('undo')
      await undoChange(tx, who, c.id)
      const [back] = await tx<{ title: string; isbn13: string | null; publication_year: number | null }[]>`select title, isbn13, publication_year from canonical_books where id = ${b.id}`
      expect(back).toEqual({ title: b.title, isbn13: null, publication_year: null })
    })
  })

  it('merges two books and un-merges them from the audit row', async () => {
    await inTx(async (tx) => {
      const two = await tx<{ id: string }[]>`select canonical_book_id as id from discussions group by 1 having count(*) > 0 limit 2`
      const [a, b] = two
      const n = async () => ({ d: await count(tx, 'discussions'), b: await count(tx, 'canonical_books'), ib: (await tx`select count(*)::int as n from imported_books where canonical_book_id = ${a.id}`)[0].n as number })
      const before = await n()
      const aDisc = (await tx`select count(*)::int as n from discussions where canonical_book_id = ${a.id}`)[0].n as number
      await mergeBooks(tx, who, a.id, b.id)
      expect((await tx`select 1 from canonical_books where id = ${a.id}`).length).toBe(0)
      expect((await n()).b).toBe(before.b - 1)
      const c = (await listChanges(tx, { email: who.email })).changes.find((x) => x.action === 'book.merge')!
      expect(c.undo.state).toBe('undo')
      await undoChange(tx, who, c.id)
      expect(await n()).toEqual(before)
      expect((await tx`select count(*)::int as n from discussions where canonical_book_id = ${a.id}`)[0].n).toBe(aDisc)
    })
  })

  it('blocks deleting a book that has discussions; deletes and restores one that has none', async () => {
    await inTx(async (tx) => {
      const [used] = await tx<{ id: string }[]>`select canonical_book_id as id from discussions limit 1`
      await expect(trashBook(tx, who, used.id)).rejects.toThrow(/has \d+ discussion/)
      const [free] = await tx<{ id: string; title: string }[]>`select b.id, b.title from canonical_books b where not exists (select 1 from discussions d where d.canonical_book_id = b.id) and exists (select 1 from imported_books i where i.canonical_book_id = b.id) limit 1`
      const imp = (await tx`select count(*)::int as n from imported_books where canonical_book_id = ${free.id}`)[0].n
      const t = await trashBook(tx, who, free.id)
      expect((await tx`select 1 from canonical_books where id = ${free.id}`).length).toBe(0)
      await restoreBook(tx, who, t.trash_id)
      expect((await tx`select title from canonical_books where id = ${free.id}`)[0].title).toBe(free.title)
      expect((await tx`select count(*)::int as n from imported_books where canonical_book_id = ${free.id}`)[0].n).toBe(imp)
    })
  })

  it('lists codes with their status and revokes an active one', async () => {
    await inTx(async (tx) => {
      const [m] = await tx<{ id: string }[]>`select id from members where auth_user_id is null limit 1`
      await tx`insert into member_invites (member_id, code_hash, created_by) values (${m.id}, 'h1', ${who.id})`
      await tx`insert into member_invites (member_id, code_hash, expires_at) values (${m.id}, 'h2', now() - interval '1 day')`
      await tx`insert into member_invites (member_id, code_hash, used_at) values (${m.id}, 'h3', now())`
      const st = (await listCodes(tx)).filter((c) => c.member_id === m.id).map((c) => c.status).sort()
      expect(st).toEqual(['Active', 'Expired', 'Used'])
      const act = (await listCodes(tx)).find((c) => c.status === 'Active' && c.member_id === m.id)!
      await revokeCode(tx, who, act.id)
      expect((await listCodes(tx)).find((c) => c.id === act.id)!.status).toBe('Revoked')
      await expect(revokeCode(tx, who, act.id)).rejects.toThrow(/already revoked/)
    })
  })

  it('computes the console numbers from the tables', async () => {
    await inTx(async (tx) => {
      const o = await overview(tx)
      expect(o.on_record).toBe(await count(tx, 'meetups'))
      expect(o.held).toBeGreaterThanOrEqual(o.on_record)
      expect(o.trend.every((p) => p.r > 0)).toBe(true)
      expect(o.no_readers).toBe((await tx`select count(*)::int as n from meetups m where not exists (select 1 from meetup_attendance a where a.meetup_id = m.id)`)[0].n)
    })
  })
})

describe('pure helpers', () => {
  it('checks ISBN check digits', () => {
    expect(cleanIsbn('978-0-306-40615-7')).toEqual({ isbn10: null, isbn13: '9780306406157' })
    expect(cleanIsbn('0306406152')).toEqual({ isbn10: '0306406152', isbn13: null })
    expect(() => cleanIsbn('12345')).toThrow()
    expect(cleanIsbn('')).toEqual({ isbn10: null, isbn13: null })
  })
  it('reads the image type from the bytes', () => {
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.ext).toBe('jpg')
    expect(imageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.ext).toBe('png')
    expect(imageType(new TextEncoder().encode('RIFFxxxxWEBPVP8 '))?.ext).toBe('webp')
    expect(imageType(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull()
  })
})
