import { HttpError } from '@/lib/http'
import { adminAction } from '@/lib/admin/route'
import { makeMeetupPdf } from '@/lib/admin/pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Fetching covers and drawing a big magazine takes a few seconds; leave room for a slow cover host.
export const maxDuration = 60

// POST /api/admin/meetups/<number>/pdf?style=magazine|classic  (admin only). No body.
export const POST = adminAction<{ number: string }>(async (req, who, p) => {
  const n = Number(p.number)
  if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found')
  return makeMeetupPdf(who, n, req.nextUrl.searchParams.get('style'))
})
