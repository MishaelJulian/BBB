import { adminRoute } from '@/lib/handlers'
import { recordMeetup, type RecordInput } from '@/lib/admin/record'

export const dynamic = 'force-dynamic'

// Record a meetup with its readers and their books in ONE transaction (all or nothing).
export const POST = adminRoute((tx, who, _p, body) => recordMeetup(tx, who, body as RecordInput))
