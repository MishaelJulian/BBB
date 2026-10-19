// Not a unit test: a generator for the round-trip comparison against the Python PDFs. Does nothing unless PDF_OUT is set.
//   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/pdf_dev PDF_OUT=/tmp/pdfwork/out/ts PDF_NUMBERS=99,71 npx vitest run src/lib/pdf/gen.test.ts
import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import { describe, it } from 'vitest'
import { loadPdfMeetup } from './data'
import { buildMeetupPdf } from './index'

const out = process.env.PDF_OUT
const url = process.env.DATABASE_URL ?? ''
describe.skipIf(!out || !/127\.0\.0\.1|localhost/.test(url))('generate PDFs for comparison', () => {
  it('writes both styles', async () => {
    const db = postgres(url, { max: 1, prepare: false })
    fs.mkdirSync(out!, { recursive: true })
    try {
      for (const n of (process.env.PDF_NUMBERS ?? '99').split(',').map(Number)) {
        const m = await loadPdfMeetup(db as never, n)
        if (!m) throw new Error(`no meetup ${n}`)
        for (const style of ['magazine', 'classic'] as const) {
          const t0 = Date.now()
          const r = await buildMeetupPdf(m, style)
          fs.writeFileSync(path.join(out!, `meetup-${n}-${style}.pdf`), r.bytes)
          console.log(n, style, `${r.pages} pages`, `${(r.bytes.length / 1e6).toFixed(2)} MB`, `${Date.now() - t0} ms`, `covers ${r.coversLoaded}/${r.coversWanted}`, `photo ${r.photo}`, `rss ${Math.round(process.memoryUsage().rss / 1e6)} MB`)
        }
      }
    } finally { await db.end() }
  }, 120000)
})
