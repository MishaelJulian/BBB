import { memberRoute } from '@/lib/handlers'
import { HttpError } from '@/lib/http'

export const dynamic = 'force-dynamic'
const MAX = 3000

/**
 * Goodreads import. The browser parses the CSV (to-read shelf only) and sends { items: [{title, author}], dry_run? }.
 * dry_run: count what would be new and what is already on the list, change nothing. Otherwise add the new ones.
 */
export const POST = memberRoute(async (tx, _who, memberId, _p, body) => {
  const raw = Array.isArray(body.items) ? body.items : null
  if (!raw) throw new HttpError(422, 'items must be a list.')
  if (raw.length > MAX) throw new HttpError(422, `Import at most ${MAX} books at a time.`)
  const seen = new Set<string>()
  const items: { title: string; author: string | null }[] = []
  for (const x of raw as { title?: unknown; author?: unknown }[]) {
    const title = typeof x?.title === 'string' ? x.title.trim().slice(0, 300) : ''
    const author = typeof x?.author === 'string' ? x.author.trim().slice(0, 200) : ''
    if (!title) continue
    const k = `${title.toLowerCase()}|${author.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    items.push({ title, author: author || null })
  }
  const have = await tx<{ title: string; author: string | null }[]>`select title, author from wishlist_items where member_id = ${memberId}`
  const haveKeys = new Set(have.map((h) => `${h.title.toLowerCase()}|${(h.author ?? '').toLowerCase()}`))
  const fresh = items.filter((i) => !haveKeys.has(`${i.title.toLowerCase()}|${(i.author ?? '').toLowerCase()}`))
  if (body.dry_run === true) return { dry_run: true, new: fresh.length, already: items.length - fresh.length, sample: fresh.slice(0, 5) }
  if (fresh.length) {
    await tx`
      insert into wishlist_items (member_id, title, author, source)
      select ${memberId}, u.t, u.a, 'goodreads' from unnest(${fresh.map((i) => i.title)}::text[], ${fresh.map((i) => i.author)}::text[]) as u(t, a)
      on conflict do nothing`
  }
  return { dry_run: false, added: fresh.length, already: items.length - fresh.length }
})
