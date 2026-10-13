import { sql } from '@/lib/db'
import { MeetupRow, meetupSelect, meetupsToDicts } from '@/lib/archive'
import { apiError, ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'bom1' // next to the Supabase project (ap-south-1)

// By meetup number ("68" or "#68") first, then by id.
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params
  const db = sql()
  const n = id.replaceAll('#', '').trim()
  let meetup: MeetupRow | undefined
  if (/^[+-]?\d+$/.test(n)) [meetup] = await db<MeetupRow[]>`${meetupSelect()} where m.meetup_number = ${Number(n)}`
  if (!meetup) [meetup] = await db<MeetupRow[]>`${meetupSelect()} where m.id = ${id}`
  if (!meetup) return apiError(404, 'Meetup not found')
  return ok((await meetupsToDicts([meetup]))[0], publicCache())
})
