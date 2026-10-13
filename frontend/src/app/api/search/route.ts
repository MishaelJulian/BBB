import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { apiError, ok, publicCache, route } from '@/lib/http'
import { BookRow, bookSelect, booksToDicts, MeetupRow, meetupSelect, meetupsToDicts } from '@/lib/archive'

export const dynamic = 'force-dynamic'

export const GET = route(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return apiError(422, 'q is required.')
  const db = sql()
  const books = await db<BookRow[]>`${bookSelect()} where b.title ilike ${'%' + q + '%'} order by b.ctid limit 10`
  const num = q.replaceAll('#', '').trim()
  const meetups = /^[+-]?\d+$/.test(num) ? await db<MeetupRow[]>`${meetupSelect()} where m.meetup_number = ${Number(num)}` : []
  return ok({ books: await booksToDicts(books), meetups: await meetupsToDicts(meetups) }, publicCache(15, 3600, 86400))
})
