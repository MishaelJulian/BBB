import { sql } from '@/lib/db'
import { BookRow, bookSelect, booksToDicts } from '@/lib/archive'
import { apiError, ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1' // next to the Supabase project (ap-south-1)

// By id, else by full name (case-insensitive).
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params
  const db = sql()
  type A = { id: string; full_name: string; country: string | null; description: string | null }
  let [author] = await db<A[]>`select id, full_name, country, description from authors where id = ${id}`
  if (!author) [author] = await db<A[]>`select id, full_name, country, description from authors where full_name ilike ${id} limit 1`
  if (!author) return apiError(404, 'Author not found in archive')
  const books = await booksToDicts(await db<BookRow[]>`${bookSelect()} where b.author_id = ${author.id} order by b.ctid`)
  const total = books.reduce((n, b) => n + b.discussion_count, 0)
  books.sort((a, b) => b.discussion_count - a.discussion_count)
  return ok({ id: author.id, full_name: author.full_name, country: author.country, description: author.description, book_count: books.length, discussion_count: total, books }, publicCache())
})
