import { sql } from '@/lib/db'
import { apiError, ok, publicCache, route } from '@/lib/http'
import { BookRow, bookSelect, booksToDicts } from '@/lib/archive'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1' // next to the Supabase project (ap-south-1)

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params
  const [book] = await sql()<BookRow[]>`${bookSelect()} where b.id = ${id}`
  if (!book) return apiError(404, 'Book not found')
  return ok((await booksToDicts([book]))[0], publicCache())
})
