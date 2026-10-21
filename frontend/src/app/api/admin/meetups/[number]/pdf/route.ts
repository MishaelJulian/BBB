import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { HttpError, route } from '@/lib/http'
import { adminAction } from '@/lib/admin/route'
import { makeMeetupPdf } from '@/lib/admin/pdf'
import { loadPdfMeetup } from '@/lib/pdf/data'
import { buildMeetupPdf, isStyle } from '@/lib/pdf/index'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Fetching covers and drawing a big magazine takes a few seconds; leave room for a slow cover host.
export const maxDuration = 60

// GET /api/admin/meetups/<number>/pdf?style=magazine|classic — redirects to stored PDF or generates & streams on the fly.
export const GET = route<{ number: string }>(async (req: NextRequest, { params }) => {
  const { number } = await params
  const n = Number(number)
  if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found')
  const styleParam = req.nextUrl.searchParams.get('style')
  if (!styleParam) {
    const [row] = await sql()<{ pdf_url: string | null }[]>`select pdf_url from meetups where meetup_number = ${n} limit 1`
    if (row?.pdf_url) {
      return NextResponse.redirect(row.pdf_url.startsWith('http') ? row.pdf_url : new URL(row.pdf_url, req.url))
    }
  }
  const style = isStyle(styleParam) ? styleParam : 'magazine'
  const m = await sql().begin((tx) => loadPdfMeetup(tx, n))
  if (!m) throw new HttpError(404, `Meetup #${n} not found`)
  if (!m.rows.length) throw new HttpError(422, `Meetup #${n} has no books recorded yet.`)
  const built = await buildMeetupPdf(m, style)
  return new Response(built.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="BBB-Meetup-${n}-${style}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
})

// POST /api/admin/meetups/<number>/pdf?style=magazine|classic  (admin only). No body.
export const POST = adminAction<{ number: string }>(async (req, who, p) => {
  const n = Number(p.number)
  if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found')
  return makeMeetupPdf(who, n, req.nextUrl.searchParams.get('style') || 'magazine')
})
