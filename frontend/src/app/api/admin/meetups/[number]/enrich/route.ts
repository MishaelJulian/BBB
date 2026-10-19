import { sql } from '@/lib/db'
import { HttpError } from '@/lib/http'
import { adminAction } from '@/lib/admin/route'
import { applyEnrich, booksOfMeetup, enrichBooks } from '@/lib/admin/enrich'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Looks up the meetup's books (Open Library, then Apple Books), fills only empty fields, answers with counts.
// {"ids": [...]} retries just those books.
export const POST = adminAction<{ number: string }>(async (_req, who, p, body) => {
  const n = Number(p.number)
  if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found')
  const books = await booksOfMeetup(sql() as never, n)
  if (!books.length) return { total: 0, enriched: 0, complete: 0, none: 0, failed: 0, failures: [] }
  const only = Array.isArray(body.ids) ? new Set(body.ids.filter((x): x is string => typeof x === 'string')) : undefined
  const results = await enrichBooks(books, only)
  return sql().begin((tx) => applyEnrich(tx, who, n, results))
})
