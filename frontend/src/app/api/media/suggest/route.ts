import { NextRequest } from 'next/server'
import { ok, route } from '@/lib/http'
import { suggestMedia } from '@/lib/goodreads'

export const dynamic = 'force-dynamic'

export const GET = route(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const mediaType = req.nextUrl.searchParams.get('media_type') ?? 'book'
  const results = await suggestMedia(q, mediaType)
  return ok(results, { 'Cache-Control': 'private, max-age=120' })
})
