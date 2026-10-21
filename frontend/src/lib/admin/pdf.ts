// Books PDF for a meetup: build it in memory (pdfkit), put it in the public `meetup-pdfs` bucket with the server-only service role key,
// then point meetups.pdf_url at it. Every PDF gets a new file name and the old file stays, so Replace can be undone from All changes.
import fs from 'node:fs/promises'
import path from 'node:path'
import { audit } from '../audit'
import { sql } from '../db'
import { HttpError } from '../http'
import { loadPdfMeetup } from '../pdf/data'
import { buildMeetupPdf, isStyle, type PdfStyle } from '../pdf/index'
import type { Caller } from '../session'

export const PDF_BUCKET = 'meetup-pdfs'
export const PDF_MAX = 20_000_000 // bytes; the biggest PDF made so far is about 7 MB (docs/ux/pdf-notes.md)

let active = 0
const MAX_ACTIVE = 2 // each build holds a few tens of MB; two at once is the most one instance will take on

/** The file name is built from a checked integer, a whitelisted style and the clock: never from anything the caller typed. */
export const pdfKey = (number: number, style: PdfStyle, now = Date.now()) => `meetup-${number}-${style}-${now}.pdf`

async function storePdf(key: string, bytes: Uint8Array): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !svc) {
    if (process.env.NODE_ENV !== 'production') {
      const localDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs')
      await fs.mkdir(localDir, { recursive: true })
      await fs.writeFile(path.join(localDir, key), bytes)
      return `/uploads/pdfs/${key}`
    }
    throw new HttpError(503, 'PDF storage is not set up yet (SUPABASE_SERVICE_ROLE_KEY is missing on the server).')
  }
  const r = await fetch(`${base}/storage/v1/object/${PDF_BUCKET}/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${svc}`, apikey: svc, 'Content-Type': 'application/pdf', 'Cache-Control': 'max-age=3600', 'x-upsert': 'false' },
    body: bytes as unknown as BodyInit,
    signal: AbortSignal.timeout(30000),
  }).catch(() => null)
  if (!r || !r.ok) throw new HttpError(503, 'The PDF was made but could not be stored. Try again in a minute.')
  return `${base}/storage/v1/object/public/${PDF_BUCKET}/${key}`
}

export async function makeMeetupPdf(who: Caller, number: number, styleIn: string | null) {
  if (!isStyle(styleIn)) throw new HttpError(422, 'Choose a style: magazine or classic.')
  const style: PdfStyle = styleIn
  if (!Number.isInteger(number) || number < 0) throw new HttpError(404, 'Meetup not found')
  if (process.env.NODE_ENV === 'production' && (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new HttpError(503, 'PDF storage is not set up yet (SUPABASE_SERVICE_ROLE_KEY is missing on the server).')
  }
  if (active >= MAX_ACTIVE) throw new HttpError(503, 'Other PDFs are being made right now. Try again in a minute.')
  active++
  try {
    const m = await sql().begin((tx) => loadPdfMeetup(tx, number))
    if (!m) throw new HttpError(404, `Meetup #${number} not found`)
    if (!m.rows.length) throw new HttpError(422, `Meetup #${number} has no books recorded yet, so there is nothing to put in a PDF.`)
    const t0 = Date.now()
    let built
    try { built = await buildMeetupPdf(m, style) } catch (e) {
      console.error('pdf build failed', number, style, e)
      throw new HttpError(503, 'The PDF could not be made. Try again in a minute.')
    }
    if (built.bytes.length > PDF_MAX) throw new HttpError(413, `The PDF came out larger than ${PDF_MAX / 1e6} MB, so it was not saved.`)
    const url = await storePdf(pdfKey(number, style), built.bytes)
    const ms = Date.now() - t0
    // The file is stored; now the row. A failure here leaves an unused file in the bucket, which is harmless (names are never reused).
    await sql().begin(async (tx) => {
      const [row] = await tx<{ id: string; pdf_url: string | null }[]>`select id, pdf_url from meetups where meetup_number = ${number} for update`
      if (!row) throw new HttpError(404, `Meetup #${number} not found`)
      await tx`update meetups set pdf_url = ${url}, updated_at = now() where id = ${row.id}`
      await audit(tx, who, 'meetup.pdf', 'meetups', row.id, { pdf_url: row.pdf_url }, { pdf_url: url, style, pages: built.pages })
    })
    console.info('pdf made', { number, style, pages: built.pages, bytes: built.bytes.length, ms, covers: `${built.coversLoaded}/${built.coversWanted}`, rssMb: Math.round(process.memoryUsage().rss / 1e6) })
    const missing = built.coversWanted - built.coversLoaded
    return {
      success: true, pdf_url: url, style, pages: built.pages, size: built.bytes.length,
      covers_missing: missing,
      message: `The ${style === 'magazine' ? 'Magazine' : 'Classic'} PDF for meetup #${number} is ready (${built.pages} page${built.pages === 1 ? '' : 's'}).` + (missing > 0 ? ` ${missing} cover${missing === 1 ? '' : 's'} could not be loaded and show as plain cards.` : ''),
    }
  } finally {
    active--
  }
}
