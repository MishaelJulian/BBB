import { HttpError } from '@/lib/http'
import { adminRoute } from '@/lib/handlers'
import { deleteMeetup, updateMeetup } from '@/lib/ops'

export const dynamic = 'force-dynamic'

const num = (v: string) => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found'); return n }

export const PUT = adminRoute<{ number: string }>((tx, who, p, body) => updateMeetup(tx, who, num(p.number), body))
export const DELETE = adminRoute<{ number: string }>((tx, who, p) => deleteMeetup(tx, who, num(p.number)), { body: false })
