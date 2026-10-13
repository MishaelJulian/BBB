import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { MeetupRow, meetupSelect, meetupsToDicts } from '@/lib/archive'
import { ok, publicCache, route } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const GET = route(async (req: NextRequest) => {
  const search = req.nextUrl.searchParams.get('search')
  const yearParam = req.nextUrl.searchParams.get('year')
  const db = sql()
  let where = db`true`
  if (search) {
    const n = search.replaceAll('#', '').trim()
    if (/^[+-]?\d+$/.test(n)) where = db`${where} and m.meetup_number = ${Number(n)}` // a non-numeric search filters nothing, as before
  }
  const year = yearParam ? Number(yearParam) : null
  if (year) where = db`${where} and extract(year from m.date) = ${year}`
  const rows = await db<MeetupRow[]>`${meetupSelect()} where ${where} order by m.date desc nulls last, m.meetup_number desc`
  return ok(await meetupsToDicts(rows), !search && !year ? publicCache() : undefined)
})
