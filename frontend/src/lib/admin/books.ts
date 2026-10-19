// Books tool: list with tabs, edit (all columns the schema has), merge and un-merge. Delete lives in trash.ts.
import { audit } from '../audit'
import { HttpError } from '../http'
import type { Caller } from '../session'
import { authorId, httpOnly, type Tx } from '../writes'
import type { AuditRow } from './changes'
import { bookUsage } from './trash'

export type BookTab = 'all' | 'na' | 'nc' | 'ni'
const NO_COVER = `(coalesce(b.cover_url, '') = '' and coalesce(b.thumbnail_url, '') = '')`
const NO_ISBN = `(coalesce(b.isbn13, '') = '' and coalesce(b.isbn10, '') = '')`

export interface BookListRow { id: string; title: string; author: string | null; no_isbn: boolean; no_cover: boolean }

export async function listBooks(tx: Tx, o: { tab: BookTab; q: string; offset: number; limit: number }) {
  const q = o.q.trim().toLowerCase()
  const where = tx`${q ? tx`(b.title ilike ${'%' + q.replace(/[\\%_]/g, '\\$&') + '%'} or a.full_name ilike ${'%' + q.replace(/[\\%_]/g, '\\$&') + '%'})` : tx`true`}`
  const tabWhere = o.tab === 'na' ? tx`b.author_id is null` : o.tab === 'nc' ? tx.unsafe(NO_COVER) : o.tab === 'ni' ? tx.unsafe(NO_ISBN) : tx`true`
  const rows = await tx<BookListRow[]>`
    select b.id, b.title, a.full_name as author, ${tx.unsafe(NO_ISBN)} as no_isbn, ${tx.unsafe(NO_COVER)} as no_cover
    from canonical_books b left join authors a on a.id = b.author_id
    where ${where} and ${tabWhere} order by lower(b.title), b.id limit ${o.limit} offset ${o.offset}`
  const [c] = await tx<{ all: number; na: number; nc: number; ni: number; shown: number }[]>`
    select count(*)::int as all, count(*) filter (where b.author_id is null)::int as na,
      count(*) filter (where ${tx.unsafe(NO_COVER)})::int as nc, count(*) filter (where ${tx.unsafe(NO_ISBN)})::int as ni,
      count(*) filter (where ${where} and ${tabWhere})::int as shown
    from canonical_books b left join authors a on a.id = b.author_id`
  return { counts: { all: c.all, na: c.na, nc: c.nc, ni: c.ni }, shown: c.shown, books: rows }
}

const TR = /\s*\(tr\.\s*([^)]+)\)\s*$/i
export const splitTranslator = (title: string) => {
  const m = title.match(TR)
  return { base: title.replace(TR, '').trim(), translator: m ? m[1].trim() : '' }
}

export async function getBook(tx: Tx, id: string) {
  const [b] = await tx<Record<string, unknown>[]>`
    select b.id, b.title, b.author_id, a.full_name as author, b.publisher_id, p.name as publisher, b.publication_year, b.isbn10, b.isbn13,
      b.cover_url, b.thumbnail_url, b.description, b.media_type
    from canonical_books b left join authors a on a.id = b.author_id left join publishers p on p.id = b.publisher_id where b.id = ${id}`
  if (!b) throw new HttpError(404, 'Book not found')
  const usage = await bookUsage(tx, id)
  const { base, translator } = splitTranslator(String(b.title))
  return { ...b, base_title: base, translator, usage, discussions: usage.discussions }
}

/** ISBN-10 or ISBN-13 with a correct check digit; returns the digits (X kept), or throws. */
export function cleanIsbn(v: unknown): { isbn10: string | null; isbn13: string | null } {
  if (v === undefined || v === null || v === '') return { isbn10: null, isbn13: null }
  if (typeof v !== 'string') throw new HttpError(422, 'ISBN must be text.')
  const d = v.replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{13}$/.test(d)) {
    const s = [...d].slice(0, 12).reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0)
    if ((10 - (s % 10)) % 10 !== Number(d[12])) throw new HttpError(422, 'That ISBN-13 does not check out. Look at the last digit.')
    return { isbn10: null, isbn13: d }
  }
  if (/^\d{9}[\dX]$/.test(d)) {
    const s = [...d].slice(0, 9).reduce((a, c, i) => a + Number(c) * (10 - i), 0)
    const last = d[9] === 'X' ? 10 : Number(d[9])
    if ((s + last) % 11 !== 0) throw new HttpError(422, 'That ISBN-10 does not check out. Look at the last digit.')
    return { isbn10: d, isbn13: null }
  }
  throw new HttpError(422, 'An ISBN has 10 or 13 digits.')
}

async function publisherId(tx: Tx, name: string): Promise<string> {
  const [p] = await tx<{ id: string }[]>`select id from publishers where lower(name) = lower(${name}) limit 1`
  if (p) return p.id
  const [n] = await tx<{ id: string }[]>`insert into publishers (id, name, created_at, updated_at) values (gen_random_uuid()::text, ${name}, now(), now()) on conflict (name) do update set name = excluded.name returning id`
  return n.id
}

/** A translator means the book is the translation: link it to the work with the base title when that exists (the club's convention). */
export async function linkTranslation(tx: Tx, id: string, title: string) {
  const tr = splitTranslator(title)
  if (!tr.translator) return
  const [orig] = await tx<{ id: string }[]>`select id from canonical_books where id <> ${id} and normalized_title = ${tr.base.toLowerCase()} limit 1`
  if (!orig) return
  const [have] = await tx`select 1 from book_relations where source_book_id = ${id} and target_book_id = ${orig.id} and relation_type = 'translation_of'`
  if (!have) await tx`insert into book_relations (source_book_id, target_book_id, relation_type) values (${id}, ${orig.id}, 'translation_of')`
}

const FIELDS = ['title', 'author_id', 'publisher_id', 'publication_year', 'isbn10', 'isbn13', 'cover_url', 'thumbnail_url', 'description'] as const

/** Edit a book. Only the fields sent are changed. Stores the full before and after of the changed columns, so All changes can undo it. */
export async function editBook(tx: Tx, who: Caller, id: string, b: Record<string, unknown>) {
  const [cur] = await tx<Record<string, unknown>[]>`select title, author_id, publisher_id, publication_year, isbn10, isbn13, cover_url, thumbnail_url, description from canonical_books where id = ${id} for update`
  if (!cur) throw new HttpError(404, 'Book not found')
  const next: Record<string, unknown> = { ...cur }
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k)

  if (has('title') || has('translator')) {
    const t = has('title') ? String(b.title ?? '').trim() : splitTranslator(String(cur.title)).base
    if (!t) throw new HttpError(422, 'The title cannot be empty.')
    const base = splitTranslator(t).base
    const tr = has('translator') ? String(b.translator ?? '').trim() : splitTranslator(t).translator || splitTranslator(String(cur.title)).translator
    next.title = tr ? `${base} (tr. ${tr})` : base
  }
  if (has('author')) {
    const n = String(b.author ?? '').trim()
    next.author_id = n ? await authorId(tx, n) : null
  }
  if (has('publisher')) {
    const n = String(b.publisher ?? '').trim()
    next.publisher_id = n ? await publisherId(tx, n) : null
  }
  if (has('publication_year')) {
    const y = b.publication_year
    if (y === null || y === '' || y === undefined) next.publication_year = null
    else {
      const n = Number(y)
      if (!Number.isInteger(n) || n < 1 || n > 2100) throw new HttpError(422, 'Year must be a number such as 1999.')
      next.publication_year = n
    }
  }
  if (has('isbn')) Object.assign(next, cleanIsbn(b.isbn))
  if (has('cover_url')) {
    const c = httpOnly(b.cover_url, 'cover_url') ?? null
    next.cover_url = c
    next.thumbnail_url = c
  }
  if (has('description')) next.description = String(b.description ?? '').trim() || null

  const before: Record<string, unknown> = {}, after: Record<string, unknown> = {}
  for (const k of FIELDS) if ((cur[k] ?? null) !== (next[k] ?? null)) { before[k] = cur[k] ?? null; after[k] = next[k] ?? null }
  if (!Object.keys(after).length) return { success: true, message: 'Nothing changed.', changed: [] as string[] }
  const [dupe] = 'title' in after
    ? await tx<{ id: string }[]>`select id from canonical_books where id <> ${id} and normalized_title = ${String(next.title).toLowerCase()} and author_id is not distinct from ${(next.author_id as string | null) ?? null} limit 1`
    : []
  if (dupe) throw new HttpError(409, 'Another book already has this title and author. Merge the two instead.')
  await tx`update canonical_books set title = ${String(next.title)}, normalized_title = ${String(next.title).toLowerCase()}, author_id = ${(next.author_id as string | null) ?? null},
    publisher_id = ${(next.publisher_id as string | null) ?? null}, publication_year = ${(next.publication_year as number | null) ?? null}::int,
    isbn10 = ${(next.isbn10 as string | null) ?? null}, isbn13 = ${(next.isbn13 as string | null) ?? null},
    cover_url = ${(next.cover_url as string | null) ?? null}, thumbnail_url = ${(next.thumbnail_url as string | null) ?? null},
    description = ${(next.description as string | null) ?? null}, updated_at = now() where id = ${id}`
  await linkTranslation(tx, id, String(next.title))
  await audit(tx, who, 'book.edit', 'canonical_books', id, before, after)
  return { success: true, message: `Book '${String(next.title)}' saved.`, changed: Object.keys(after) }
}

// ---------------------------------------------------------------- merge

const MOVES: [string, string][] = [
  ['discussions', 'canonical_book_id'], ['book_mentions', 'canonical_book_id'], ['quotes', 'canonical_book_id'], ['current_reads', 'canonical_book_id'],
  ['recommendations', 'canonical_book_id'], ['editions', 'work_id'], ['possible_duplicates', 'candidate_canonical_id'], ['imported_books', 'canonical_book_id'],
]

export async function mergeBooks(tx: Tx, who: Caller, fromId: string, intoId: string) {
  if (fromId === intoId) throw new HttpError(422, 'Pick a different book to merge into.')
  const [src] = await tx<{ id: string; title: string; j: unknown }[]>`select id, title, to_jsonb(b) as j from canonical_books b where id = ${fromId} for update`
  const [dst] = await tx<{ id: string; title: string }[]>`select id, title from canonical_books where id = ${intoId} for update`
  if (!src) throw new HttpError(404, 'Book not found')
  if (!dst) throw new HttpError(404, 'The book to merge into was not found')
  const moved: Record<string, string[]> = {}
  for (const [t, col] of MOVES) {
    const ids = (await tx<{ id: string }[]>`select id from ${tx(t)} where ${tx(col)} = ${fromId}`).map((r) => r.id)
    moved[t] = ids
    if (ids.length) await tx`update ${tx(t)} set ${tx(col)} = ${intoId} where id in ${tx(ids)}`
  }
  const wi = await tx<{ scheme: string; value: string }[]>`select scheme, value from work_identifiers where work_id = ${fromId}`
  await tx`update work_identifiers set work_id = ${intoId} where work_id = ${fromId}`
  const rel = await tx<{ j: unknown; id: string; s: string; t: string }[]>`select to_jsonb(r) as j, id, source_book_id as s, target_book_id as t from book_relations r where source_book_id = ${fromId} or target_book_id = ${fromId}`
  const relMoved: { id: string; s: string; t: string }[] = [], relDropped: unknown[] = []
  for (const r of rel) {
    const s = r.s === fromId ? intoId : r.s, t = r.t === fromId ? intoId : r.t
    if (s === t) { relDropped.push(r.j); await tx`delete from book_relations where id = ${r.id}` }
    else { relMoved.push({ id: r.id, s: r.s, t: r.t }); await tx`update book_relations set source_book_id = ${s}, target_book_id = ${t} where id = ${r.id}` }
  }
  await tx`delete from canonical_books where id = ${fromId}`
  await audit(tx, who, 'book.merge', 'canonical_books', fromId, { source: src.j, moved, work_identifiers: wi, relations_moved: relMoved, relations_dropped: relDropped }, { target_id: intoId, title: dst.title, from_title: src.title })
  return { success: true, message: `'${src.title}' merged into '${dst.title}'.`, into: intoId }
}

export async function unmergeBooks(tx: Tx, who: Caller, a: AuditRow) {
  const b = (a.before ?? {}) as { source: unknown; moved: Record<string, string[]>; work_identifiers: { scheme: string; value: string }[]; relations_moved: { id: string; s: string; t: string }[]; relations_dropped: unknown[] }
  const fromId = a.row_id!
  await tx`insert into canonical_books select * from jsonb_populate_record(null::canonical_books, ${tx.json(b.source as never)})`
  for (const [t, col] of MOVES) {
    const ids = b.moved[t] ?? []
    if (ids.length) await tx`update ${tx(t)} set ${tx(col)} = ${fromId} where id in ${tx(ids)}`
  }
  for (const w of b.work_identifiers ?? []) await tx`update work_identifiers set work_id = ${fromId} where scheme = ${w.scheme} and value = ${w.value}`
  for (const r of b.relations_moved ?? []) await tx`update book_relations set source_book_id = ${r.s}, target_book_id = ${r.t} where id = ${r.id}`
  for (const r of b.relations_dropped ?? []) await tx`insert into book_relations select * from jsonb_populate_record(null::book_relations, ${tx.json(r as never)})`
  await audit(tx, who, 'book.restore', 'canonical_books', fromId, null, { unmerged_from: (a.after as { target_id?: string } | null)?.target_id })
}
