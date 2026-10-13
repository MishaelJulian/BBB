// The write operations, ported from app/api/main.py. Each takes a transaction and the caller, so it can be tested inside a
// transaction that rolls back. Route files only authenticate, validate input and call these.
import { audit } from './audit'
import { HttpError } from './http'
import type { Caller } from './session'
import { authorId, cleanNames, dateOrNull, GENERAL, httpOnly, mediaOf, memberId, present, type Tx, venueId } from './writes'

type Body = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const trimmed = (v: unknown) => str(v)?.trim()
const num = (v: unknown, what: string): number | null => {
  if (v === undefined || v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new HttpError(422, `${what} must be a number.`)
  return v
}

// ---------------------------------------------------------------- meetups

export async function createMeetup(tx: Tx, who: Caller, b: Body) {
  let n = typeof b.meetup_number === 'number' ? b.meetup_number : null
  if (n === null) {
    const [m] = await tx<{ max: number | null }[]>`select max(meetup_number)::int as max from meetups`
    n = (m?.max ?? 0) + 1
  } else if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'Meetup number must be greater than 0')
  } else if ((await tx`select 1 from meetups where meetup_number = ${n}`).length) {
    throw new HttpError(400, `Meetup #${n} already exists`)
  }
  const date = dateOrNull(b.date)
  const venueName = trimmed(b.venue) ?? ''
  const vid = venueName ? await venueId(tx, venueName) : null
  const title = trimmed(b.title) || `BBB Meetup #${n}`
  const format = trimmed(b.format) || 'IN_PERSON'
  const description = trimmed(b.description) || null
  const [row] = await tx<{ id: string; number: number; date: string | null; title: string }[]>`
    insert into meetups (meetup_number, date, title, venue_id, format, description)
    values (${n}, ${date}::date, ${title}, ${vid}, ${format}, ${description})
    returning id, meetup_number as number, date::text as date, title`
  await audit(tx, who, 'meetup.create', 'meetups', row.id, null, row)
  return { success: true, message: `Meetup #${n} created successfully`, meetup: { ...row, venue: venueName || null, books_count: 0, books: [] } }
}

export async function updateMeetup(tx: Tx, who: Caller, number: number, b: Body) {
  const [m] = await tx<{ id: string; date: string | null; title: string | null; venue_id: string | null }[]>`
    select id, date::text as date, title, venue_id from meetups where meetup_number = ${number} for update`
  if (!m) throw new HttpError(404, 'Meetup not found')
  let date = m.date, title = m.title, vid = m.venue_id
  if (str(b.date)) {
    try { date = dateOrNull(b.date) ?? date } catch { /* an invalid date is ignored, as before */ }
  }
  if (str(b.title) !== undefined) title = trimmed(b.title) ?? title
  if (str(b.venue) !== undefined) {
    const name = trimmed(b.venue) ?? ''
    if (name) vid = await venueId(tx, name)
  }
  await tx`update meetups set date = ${date}::date, title = ${title}, venue_id = ${vid}, updated_at = now() where id = ${m.id}`
  await audit(tx, who, 'meetup.update', 'meetups', m.id, { date: m.date, title: m.title, venue_id: m.venue_id }, { date, title, venue_id: vid })
  return { success: true, message: `Meetup #${number} updated successfully` }
}

export async function deleteMeetup(tx: Tx, who: Caller, number: number) {
  const [m] = await tx<{ id: string; title: string | null; date: string | null }[]>`
    select id, title, date::text as date from meetups where meetup_number = ${number} for update`
  if (!m) throw new HttpError(404, `Meetup #${number} not found`)
  // Postgres will not cascade these (the Python ORM did): remove what hangs off the meetup first, children before parents.
  const discs = tx`select id from discussions where meetup_id = ${m.id}`
  await tx`delete from book_mentions where discussion_id in (${discs})`
  await tx`delete from quotes where discussion_id in (${discs})`
  await tx`delete from discussion_participants where discussion_id in (${discs})`
  const removed = await tx`delete from discussions where meetup_id = ${m.id}`
  await tx`delete from resources where meetup_id = ${m.id}`
  await tx`delete from current_reads where meetup_id = ${m.id}`
  await tx`delete from recommendations where meetup_id = ${m.id}`
  await tx`delete from meetups where id = ${m.id}` // meetup_attendance cascades
  await audit(tx, who, 'meetup.delete', 'meetups', m.id, { number, title: m.title, date: m.date, discussions_removed: removed.count }, null)
  return { success: true, message: `Meetup #${number} deleted successfully` }
}

// ---------------------------------------------------------------- books on a meetup

interface BookRow { id: string; title: string }

/** Adds a book (or any media) to a meetup. `forceMemberId` is for a member adding their own entry; `joinExisting` lets them join a book already listed. */
export async function addBookToMeetup(tx: Tx, who: Caller, number: number, b: Body, opts?: { forceMemberId?: string; joinExisting?: boolean }) {
  const [meetup] = await tx<{ id: string }[]>`select id from meetups where meetup_number = ${number}`
  if (!meetup) throw new HttpError(404, 'Meetup not found')
  const title = trimmed(b.title)
  if (!title) throw new HttpError(422, 'title is required.')

  const authorName = trimmed(b.author)
  // A member's own entry must not change shared catalog data: an existing book is left exactly as it is, and an author row is only made for a NEW book.
  const memberOwned = Boolean(opts?.forceMemberId)
  let aid: string | null = null
  const { code: mType, legacyTangent } = await mediaOf(tx, str(b.media_type))
  const isTangent = Boolean(b.is_tangent) || legacyTangent
  const ext = httpOnly(b.url, 'url') ?? null
  const cover = httpOnly(b.cover_url, 'cover_url') ?? null
  const thumb = httpOnly(b.thumbnail_url, 'thumbnail_url') ?? null
  const year = num(b.publication_year, 'publication_year'), rating = num(b.rating, 'rating')
  const goodreads = str(b.goodreads_id) || null, description = str(b.description) || null

  // Match the importer's normalized form or the title as typed, so a title with curly quotes or punctuation does not become a second book.
  let [book] = await tx<BookRow[]>`select id, title from canonical_books where normalized_title = ${title.toLowerCase()} or lower(title) = ${title.toLowerCase()} order by (normalized_title = ${title.toLowerCase()}) desc limit 1`
  if (!book) {
    aid = authorName ? await authorId(tx, authorName) : null
    ;[book] = await tx<BookRow[]>`
      insert into canonical_books (title, normalized_title, author_id, cover_url, thumbnail_url, publication_year, rating, goodreads_id, description, media_type, external_url)
      values (${title}, ${title.toLowerCase()}, ${aid}, ${cover}, ${thumb ?? cover}, ${year}::int, ${rating}::float8, ${goodreads}, ${description}, ${mType}, ${ext})
      returning id, title`
  } else {
    const already = await tx`select 1 from discussions where meetup_id = ${meetup.id} and canonical_book_id = ${book.id} limit 1`
    if (already.length && !opts?.joinExisting) {
      throw new HttpError(400, `Item '${book.title}' is already in Meetup #${number}'s list. Edit the existing item to update details or add discussants.`)
    }
    // Admins only: fill in what the archive is missing; never overwrite what it has. Members' entries skip this entirely.
    if (!memberOwned) {
      aid = authorName ? await authorId(tx, authorName) : null
      await tx`
      update canonical_books set
        thumbnail_url = case when coalesce(cover_url, '') = '' and ${cover}::text is not null then coalesce(${thumb}::text, ${cover}::text) else thumbnail_url end,
        cover_url = coalesce(nullif(cover_url, ''), ${cover}::text),
        publication_year = case when coalesce(publication_year, 0) = 0 then coalesce(${year}::int, publication_year) else publication_year end,
        rating = case when coalesce(rating, 0) = 0 then coalesce(${rating}::float8, rating) else rating end,
        goodreads_id = coalesce(nullif(goodreads_id, ''), ${goodreads}::text),
        description = coalesce(nullif(description, ''), ${description}::text),
        author_id = coalesce(author_id, ${aid}::text),
        media_type = case when ${mType}::text <> 'book' and coalesce(media_type, 'book') = 'book' then ${mType}::text else media_type end,
        external_url = coalesce(nullif(external_url, ''), ${ext}::text),
        updated_at = now()
      where id = ${book.id}`
    }
  }

  const isGen = Boolean(b.is_general_discussion) || mType !== 'book'
  const topic = isGen ? 'General Discussion' : null
  let notes = trimmed(b.notes) || null
  if (isGen && !notes) notes = 'General Discussion'

  const insertDisc = (mid: string | null) => tx`
    insert into discussions (meetup_id, canonical_book_id, member_id, topic, notes, media_type, is_tangent, external_url)
    values (${meetup.id}, ${book.id}, ${mid}, ${topic}, ${notes}, ${mType}, ${isTangent}, ${ext})`
  const has = async (mid: string | null) =>
    (await (mid === null
      ? tx`select 1 from discussions where meetup_id = ${meetup.id} and canonical_book_id = ${book.id} limit 1`
      : tx`select 1 from discussions where meetup_id = ${meetup.id} and canonical_book_id = ${book.id} and member_id = ${mid} limit 1`)).length > 0

  const memberIds: string[] = []
  if (opts?.forceMemberId) memberIds.push(opts.forceMemberId)
  else for (const name of cleanNames(str(b.member))) memberIds.push(await memberId(tx, name))

  if (memberIds.length === 0) {
    if (!(await has(null))) await insertDisc(null)
  } else {
    for (const mid of memberIds) if (!(await has(mid))) await insertDisc(mid)
  }
  await audit(tx, who, opts?.forceMemberId ? 'entry.add' : 'meetup.add_book', 'discussions', book.id, null, { meetup: number, title, media_type: mType, readers: memberIds.length })
  return { success: true, message: `Added '${title}' to Meetup #${number}` }
}

interface Disc { id: string; member_id: string | null; topic: string | null; notes: string | null; media_type: string; is_tangent: boolean; external_url: string | null }

export async function updateBook(tx: Tx, who: Caller, id: string, b: Body) {
  const title = trimmed(b.title)
  if (!title) throw new HttpError(422, 'title is required.')
  const [book] = await tx<{ id: string; title: string; author_id: string | null; media_type: string | null }[]>`
    select id, title, author_id, media_type from canonical_books where id = ${id} for update`
  if (!book) throw new HttpError(404, 'Book not found')
  const url = httpOnly(b.url, 'url'), cover = httpOnly(b.cover_url, 'cover_url'), thumb = httpOnly(b.thumbnail_url, 'thumbnail_url')

  let authorSet = false, aid: string | null = book.author_id
  if (typeof b.author === 'string') {
    const clean = b.author.trim()
    aid = clean ? await authorId(tx, clean) : null
    authorSet = true
  }

  const discId = str(b.discussion_id)
  if (discId) {
    const [disc] = await tx<(Disc & { meetup_id: string; canonical_book_id: string | null })[]>`
      select id, member_id, topic, notes, media_type, is_tangent, external_url, meetup_id, canonical_book_id from discussions where id = ${discId}`
    if (disc) {
      const target = disc.canonical_book_id ?? book.id
      let discs: Disc[] = Array.from(await tx<Disc[]>`
        select id, member_id, topic, notes, media_type, is_tangent, external_url from discussions
        where meetup_id = ${disc.meetup_id} and canonical_book_id = ${target} order by ctid`)
      if (!discs.length) discs = [disc]

      if (typeof b.member === 'string') {
        const names = cleanNames(b.member)
        if (!names.length) {
          // No readers: keep one row with no member, drop the rest.
          const [first, ...extra] = discs
          await tx`update discussions set member_id = null, updated_at = now() where id = ${first.id}`
          first.member_id = null
          for (const e of extra) await tx`delete from discussions where id = ${e.id}`
          discs = [first]
        } else {
          const targets: string[] = []
          for (const n of names) targets.push(await memberId(tx, n))
          const byMember = new Map<string, Disc>(), unassigned: Disc[] = []
          for (const d of discs) (d.member_id ? byMember.set(d.member_id, d) : unassigned.push(d))
          const kept: Disc[] = []
          for (const mid of targets) {
            const existing = byMember.get(mid)
            if (existing) { kept.push(existing); byMember.delete(mid) }
            else if (unassigned.length) {
              const reuse = unassigned.pop()!
              await tx`update discussions set member_id = ${mid}, updated_at = now() where id = ${reuse.id}`
              reuse.member_id = mid
              kept.push(reuse)
            } else {
              const [nd] = await tx<{ id: string }[]>`
                insert into discussions (meetup_id, canonical_book_id, member_id, topic, notes)
                values (${disc.meetup_id}, ${target}, ${mid}, ${disc.topic}, ${disc.notes}) returning id`
              kept.push({ id: nd.id, member_id: mid, topic: disc.topic, notes: disc.notes, media_type: 'book', is_tangent: false, external_url: null })
            }
          }
          for (const left of [...byMember.values(), ...unassigned]) await tx`delete from discussions where id = ${left.id}`
          discs = kept
        }
      }

      const mediaChange = typeof b.media_type === 'string' ? await mediaOf(tx, b.media_type) : null
      for (const d of discs) {
        if (typeof b.notes === 'string') d.notes = b.notes.trim() || null
        if (mediaChange) { d.media_type = mediaChange.code; if (mediaChange.legacyTangent) d.is_tangent = true }
        if (typeof b.is_tangent === 'boolean') d.is_tangent = b.is_tangent
        if (url !== undefined) d.external_url = url
        if (typeof b.is_general_discussion === 'boolean') {
          if (b.is_general_discussion) {
            d.topic = 'General Discussion'
            if (!d.notes || !GENERAL.test(d.notes)) d.notes = 'General Discussion'
          } else {
            if (d.topic && GENERAL.test(d.topic)) d.topic = null
            if (d.notes && GENERAL.test(d.notes)) d.notes = null
          }
        }
        await tx`
          update discussions set topic = ${d.topic}, notes = ${d.notes}, media_type = ${d.media_type}, is_tangent = ${d.is_tangent},
            external_url = ${d.external_url}, updated_at = now() where id = ${d.id}`
      }
    }
  }

  const bookMedia = typeof b.media_type === 'string' ? (await mediaOf(tx, b.media_type)).code : book.media_type
  const year = present(b.publication_year) ? num(b.publication_year, 'publication_year') : undefined
  const rating = present(b.rating) ? num(b.rating, 'rating') : undefined
  await tx`
    update canonical_books set
      title = ${title}, normalized_title = ${title.toLowerCase()},
      author_id = ${authorSet ? aid : book.author_id},
      media_type = ${bookMedia ?? 'book'},
      external_url = case when ${url !== undefined} then ${url ?? null}::text else external_url end,
      cover_url = case when ${Boolean(cover)} then ${cover ?? null}::text else cover_url end,
      thumbnail_url = case when ${Boolean(cover)} then coalesce(${thumb ?? null}::text, ${cover ?? null}::text) else thumbnail_url end,
      publication_year = case when ${year !== undefined} then ${year ?? null}::int else publication_year end,
      rating = case when ${rating !== undefined} then ${rating ?? null}::float8 else rating end,
      goodreads_id = case when ${typeof b.goodreads_id === 'string'} then ${str(b.goodreads_id) ?? null}::text else goodreads_id end,
      updated_at = now()
    where id = ${id}`
  await audit(tx, who, 'book.update', 'canonical_books', id, { title: book.title, author_id: book.author_id }, { title, author_id: authorSet ? aid : book.author_id })
  return { success: true, message: `Book '${title}' updated successfully` }
}

// ---------------------------------------------------------------- discussions

export async function deleteDiscussion(tx: Tx, who: Caller, id: string) {
  const [d] = await tx<{ id: string; meetup_id: string; canonical_book_id: string | null }[]>`select id, meetup_id, canonical_book_id from discussions where id = ${id}`
  if (!d) throw new HttpError(404, 'Discussion entry not found')
  const group = d.meetup_id && d.canonical_book_id
    ? tx`select id from discussions where meetup_id = ${d.meetup_id} and canonical_book_id = ${d.canonical_book_id}`
    : tx`select id from discussions where id = ${d.id}`
  await tx`delete from book_mentions where discussion_id in (${group})`
  await tx`delete from quotes where discussion_id in (${group})`
  await tx`delete from discussion_participants where discussion_id in (${group})`
  const gone = await tx`delete from discussions where id in (${group})`
  await audit(tx, who, 'discussion.delete', 'discussions', id, { meetup_id: d.meetup_id, canonical_book_id: d.canonical_book_id, rows: gone.count }, null)
  return { success: true, message: 'Book removed from meetup successfully' }
}

export async function toggleGeneral(tx: Tx, who: Caller, id: string, isGeneral: boolean) {
  const [d] = await tx<{ id: string; meetup_id: string; canonical_book_id: string | null }[]>`select id, meetup_id, canonical_book_id from discussions where id = ${id}`
  if (!d) throw new HttpError(404, 'Discussion entry not found')
  const rows = d.meetup_id && d.canonical_book_id
    ? await tx<{ id: string; topic: string | null; notes: string | null }[]>`select id, topic, notes from discussions where meetup_id = ${d.meetup_id} and canonical_book_id = ${d.canonical_book_id}`
    : await tx<{ id: string; topic: string | null; notes: string | null }[]>`select id, topic, notes from discussions where id = ${d.id}`
  let first: string | null = null
  for (const r of rows) {
    let { topic, notes } = r
    if (isGeneral) {
      topic = 'General Discussion'
      if (!notes || !GENERAL.test(notes)) notes = 'General Discussion'
    } else {
      if (topic && GENERAL.test(topic)) topic = null
      if (notes && GENERAL.test(notes)) notes = null
    }
    await tx`update discussions set topic = ${topic}, notes = ${notes}, updated_at = now() where id = ${r.id}`
    if (r.id === id) first = notes
  }
  await audit(tx, who, 'discussion.general', 'discussions', id, null, { is_general_discussion: isGeneral })
  return { success: true, discussion_id: id, is_general_discussion: isGeneral, notes: first }
}

// ---------------------------------------------------------------- members

async function findMember(tx: Tx, key: string) {
  const [m] = await tx<{ id: string; display_name: string; normalized_name: string; bio: string | null; is_hidden: boolean }[]>`
    select id, display_name, normalized_name, bio, is_hidden from members where id = ${key} or lower(display_name) = lower(${key}) limit 1 for update`
  return m
}

export async function setMemberHidden(tx: Tx, who: Caller, key: string, hidden?: boolean) {
  const m = await findMember(tx, key)
  if (!m) throw new HttpError(404, 'Member not found')
  const next = hidden ?? !m.is_hidden
  await tx`update members set is_hidden = ${next}, updated_at = now() where id = ${m.id}`
  await audit(tx, who, 'member.visibility', 'members', m.id, { is_hidden: m.is_hidden }, { is_hidden: next })
  return { success: true, id: m.id, display_name: m.display_name, is_hidden: next, message: `Member '${m.display_name}' ${next ? 'hidden from' : 'restored to'} public archive.` }
}

export async function makeMember(tx: Tx, who: Caller, id: string) {
  const [m] = await tx<{ id: string; display_name: string; status: string }[]>`select id, display_name, status from members where id = ${id} for update`
  if (!m) throw new HttpError(404, 'member not found')
  await tx`update members set status = 'member', updated_at = now() where id = ${id}`
  await audit(tx, who, 'member.promote', 'members', id, { status: m.status }, { status: 'member' })
  return { id: m.id, display_name: m.display_name, status: 'member' }
}

export async function deleteMember(tx: Tx, who: Caller, key: string) {
  const m = await findMember(tx, key)
  if (!m) throw new HttpError(404, 'Member not found')
  const discIds = (await tx<{ id: string }[]>`select id from discussions where member_id = ${m.id}`).map((r) => r.id)
  // A recovery snapshot first, then unlink everything that pointed at the member so the books stay on their meetups.
  await tx`
    insert into removed_members_archive (id, display_name, normalized_name, bio, discussions_snapshot)
    values (${m.id}, ${m.display_name}, ${m.normalized_name}, ${m.bio}, ${JSON.stringify(discIds)})
    on conflict (id) do update set display_name = excluded.display_name, normalized_name = excluded.normalized_name, bio = excluded.bio,
      discussions_snapshot = excluded.discussions_snapshot, removed_at = now()`
  await tx`update discussions set member_id = null, updated_at = now() where member_id = ${m.id}`
  await tx`update quotes set member_id = null where member_id = ${m.id}`
  await tx`update recommendations set recommender_id = null where recommender_id = ${m.id}`
  await tx`delete from current_reads where member_id = ${m.id}`
  await tx`delete from discussion_participants where member_id = ${m.id}`
  await tx`delete from members where id = ${m.id}` // attendance rows and invite codes cascade
  await audit(tx, who, 'member.delete', 'members', m.id, { display_name: m.display_name, discussions: discIds.length }, null)
  return { success: true, id: m.id, display_name: m.display_name, message: `Member '${m.display_name}' removed from database.` }
}

export async function restoreMember(tx: Tx, who: Caller, key: string) {
  const [row] = await tx<{ id: string; display_name: string; normalized_name: string; bio: string | null; discussions_snapshot: string | null }[]>`
    select id, display_name, normalized_name, bio, discussions_snapshot from removed_members_archive where id = ${key} or display_name = ${key} limit 1 for update`
  if (!row) throw new HttpError(404, 'Removed member record not found in archive')
  await tx`insert into members (id, display_name, normalized_name, bio) values (${row.id}, ${row.display_name}, ${row.normalized_name}, ${row.bio})`
  const ids: string[] = row.discussions_snapshot ? JSON.parse(row.discussions_snapshot) : []
  if (ids.length) await tx`update discussions set member_id = ${row.id}, updated_at = now() where id in ${tx(ids)}`
  await tx`delete from removed_members_archive where id = ${row.id}`
  await audit(tx, who, 'member.restore', 'members', row.id, null, { display_name: row.display_name, discussions_relinked: ids.length })
  return { success: true, id: row.id, display_name: row.display_name, message: `Member '${row.display_name}' restored to database.` }
}

// ---------------------------------------------------------------- a member's own entries

export async function removeOwnEntry(tx: Tx, who: Caller, ownMemberId: string, discussionId: string) {
  const [d] = await tx<{ id: string }[]>`select id from discussions where id = ${discussionId} and member_id = ${ownMemberId} for update`
  if (!d) throw new HttpError(404, 'That entry is not yours, or it no longer exists.') // never reveal whether someone else's entry exists
  await tx`delete from book_mentions where discussion_id = ${d.id}`
  await tx`delete from quotes where discussion_id = ${d.id}`
  await tx`delete from discussion_participants where discussion_id = ${d.id}`
  await tx`delete from discussions where id = ${d.id}`
  await audit(tx, who, 'entry.remove', 'discussions', d.id, { member_id: ownMemberId }, null)
  return { success: true }
}
