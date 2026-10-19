import { HttpError } from '@/lib/http'
import { adminRoute } from '@/lib/handlers'
import { updateMeetup } from '@/lib/ops'
import { trashMeetup } from '@/lib/admin/trash'

export const dynamic = 'force-dynamic'

const num = (v: string) => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found'); return n }

export const PUT = adminRoute<{ number: string }>((tx, who, p, body) => updateMeetup(tx, who, num(p.number), body))
// Delete = move to the 7-day trash (restore from the Meetups tool or All changes). The old hard delete (ops.deleteMeetup) is no longer reachable.
export const DELETE = adminRoute<{ number: string }>((tx, who, p) => trashMeetup(tx, who, num(p.number)), { body: false })
