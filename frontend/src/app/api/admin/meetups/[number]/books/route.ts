import { HttpError } from '@/lib/http'
import { adminRoute } from '@/lib/handlers'
import { addBookToMeetup } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ number: string }>((tx, who, p, body) => {
  const n = Number(p.number)
  if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found')
  return addBookToMeetup(tx, who, n, body)
})
