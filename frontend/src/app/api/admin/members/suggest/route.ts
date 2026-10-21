import { NextRequest } from 'next/server'
import { ok, route } from '@/lib/http'
import { suggestMembers } from '@/lib/goodreads'

export const dynamic = 'force-dynamic'

export const GET = route(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get('q')
  const bookId = req.nextUrl.searchParams.get('book_id')
  const results = await suggestMembers(q, bookId)
  return ok(results, { 'Cache-Control': 'private, no-store' })
})
