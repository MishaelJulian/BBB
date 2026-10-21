import { NextRequest } from 'next/server'
import { ok, route } from '@/lib/http'
import { resolveMediaUrl } from '@/lib/goodreads'

export const dynamic = 'force-dynamic'

export const GET = route(async (req: NextRequest) => {
  const url = req.nextUrl.searchParams.get('url') ?? ''
  const result = await resolveMediaUrl(url)
  return ok(result, { 'Cache-Control': 'private, max-age=120' })
})
