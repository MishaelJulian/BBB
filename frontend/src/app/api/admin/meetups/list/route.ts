import { sql } from '@/lib/db'
import { listMeetups } from '@/lib/admin/meetups'
import { listTrash } from '@/lib/admin/trash'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

export const GET = adminGet(() => sql().begin(async (tx) => ({ meetups: await listMeetups(tx), deleted: await listTrash(tx, 'meetup') })))
