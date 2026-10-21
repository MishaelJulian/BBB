import { NextRequest } from 'next/server'
import { checkAdmin } from '@/lib/admin'
import { apiError, ok, route } from '@/lib/http'
import { enrichMeetupBooksFromGoodreads } from '@/lib/goodreads'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = route<{ number: string }>(async (req: NextRequest, { params }) => {
  const who = await checkAdmin(req)
  if (who.status === 'unauthenticated') return apiError(401, 'Sign in to continue.')
  if (who.status === 'forbidden') return apiError(403, 'Admin privileges required.')
  const { number } = await params
  const num = Number(number)
  if (!Number.isInteger(num)) return apiError(404, 'Meetup not found')
  const res = await enrichMeetupBooksFromGoodreads(num)
  if (!res) return apiError(404, 'Meetup not found')
  return ok(res, { 'Cache-Control': 'private, no-store' })
})
