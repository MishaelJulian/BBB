// Classic style: the plain archive document (landscape A4: summary, optional photo, table of books). Port of generate_classic_meetup_pdf
// (reportlab platypus). Geometry follows platypus: 36 pt margins plus the frame's 6 pt padding, tables 6 pt wider than the frame on each side.
import { formatMeetupDate, oneLine, sanitizeFor, winAnsiHas, wrapText } from './format'
import type { PdfMeetup } from './data'
import { Doc, finish, newDoc, pageH, type PdfResult, widthOf } from './doc'
import type { Prepared } from './images'

export const A4_LANDSCAPE: [number, number] = [841.89, 595.275]
const MARGIN = 36
const FRAME_PAD = 6

const HELV = 'Helvetica', HELV_B = 'Helvetica-Bold', HELV_I = 'Helvetica-Oblique'
interface Style { font: string; size: number; leading: number; color: string; center?: boolean }
const ST = {
  title: { font: HELV_B, size: 20, leading: 24, color: '#14130F' },
  meta: { font: HELV, size: 11, leading: 15, color: '#5A5248' },
  sumHead: { font: HELV_B, size: 11, leading: 14, color: '#8B4513' },
  sumText: { font: HELV, size: 9.5, leading: 13.5, color: '#22201D' },
  th: { font: HELV_B, size: 9.5, leading: 12, color: '#FFFFFF' },
  idx: { font: HELV, size: 9, leading: 12, color: '#5A5248', center: true },
  member: { font: HELV_B, size: 9, leading: 12, color: '#14130F' },
  book: { font: HELV, size: 9, leading: 12, color: '#14130F' },
  author: { font: HELV_I, size: 9, leading: 12, color: '#4A4238' },
  section: { font: HELV_B, size: 12, leading: 16, color: '#14130F' },
} satisfies Record<string, Style>
// reportlab puts the first baseline one font size below the top of a paragraph (measured against the Python output).
const ASC = 1

export function renderClassic(m: PdfMeetup, photo: Prepared | null): Promise<PdfResult> {
  const [W, H] = A4_LANDSCAPE
  const { doc, done } = newDoc(A4_LANDSCAPE, { Title: `Broke Bibliophiles Bangalore - Meetup #${m.number}`, Author: 'Broke Bibliophiles Bangalore' })
  const S = (t: string) => sanitizeFor(t, winAnsiHas)
  const lines = (text: string, st: Style, width: number) => wrapText(S(text), width, (t) => widthOf(doc, t, st.font, st.size), true)

  const frameLeft = MARGIN + FRAME_PAD
  const frameW = W - 2 * (MARGIN + FRAME_PAD)
  const tableLeft = MARGIN // platypus centres a table that is 12 pt wider than the frame
  const tableW = W - 2 * MARGIN
  const top = MARGIN + FRAME_PAD
  const bottom = H - MARGIN - FRAME_PAD
  let y = top
  const pages: number[] = []

  const newPage = () => { doc.addPage({ size: A4_LANDSCAPE, margin: 0 }); pages.push(1); y = top }
  const text = (s: string, x: number, topY: number, st: Style, width: number, align: 'left' | 'center' = 'left') => {
    lines(s, st, width).forEach((l, i) => {
      const lx = align === 'center' ? x + (width - widthOf(doc, l, st.font, st.size)) / 2 : x
      doc.font(st.font).fontSize(st.size).fillColor(st.color)
      // pdfkit puts the baseline `ascender` below the y given; reportlab's first baseline is one font size below the paragraph top.
      const asc = (doc as unknown as { _font: { ascender: number } })._font.ascender / 1000 * st.size
      doc.text(l, lx, topY + i * st.leading + ASC * st.size - asc, { lineBreak: false })
    })
  }
  const height = (s: string, st: Style, width: number) => lines(s, st, width).length * st.leading
  const flow = (h: number) => { if (y + h > bottom && pages.length) newPage() }

  newPage()
  // Title and subtitle
  const titleT = `Broke Bibliophiles Bangalore, Meetup #${m.number}`
  flow(height(titleT, ST.title, frameW)); text(titleT, frameLeft, y, ST.title, frameW); y += height(titleT, ST.title, frameW) + 4
  const metaT = `${formatMeetupDate(m.date)} @${m.venue} · Church Street, Bangalore`
  flow(height(metaT, ST.meta, frameW)); text(metaT, frameLeft, y, ST.meta, frameW); y += height(metaT, ST.meta, frameW) + 10

  // Summary box
  const summary = oneLine(m.description) || `Discussion meeting of Broke Bibliophiles Bangalore Meetup #${m.number}.`
  const innerW = tableW - 20
  const sumLines = lines(summary, ST.sumText, innerW)
  const r1 = ST.sumHead.leading + 12
  const r2 = sumLines.length * ST.sumText.leading + 12
  flow(r1 + r2)
  doc.save().rect(tableLeft, y, tableW, r1 + r2).fillColor('#FAF8F5').fill().restore()
  doc.save().rect(tableLeft, y, tableW, r1 + r2).lineWidth(1).strokeColor('#E5E0DB').stroke().restore()
  text('MEETUP SUMMARY', tableLeft + 10, y + 6, ST.sumHead, innerW)
  text(summary, tableLeft + 10, y + r1 + 6, ST.sumText, innerW)
  y += r1 + r2 + 14

  // Group photo (stretched to 320 x 180 like the Python version)
  if (photo) {
    const rowH = 180 + 4 + 6
    flow(rowH)
    try {
      doc.image(photo.data, tableLeft + (tableW - 320) / 2, y + 4, { width: 320, height: 180 })
      y += rowH + 10
    } catch { /* no photo, as in the Python version's except branch */ }
  }

  // Section heading
  flow(ST.section.leading)
  text('LIST OF BOOKS DISCUSSED', frameLeft, y, ST.section, frameW); y += ST.section.leading + 8

  // Table
  const colW = [35, 145, 330, tableW - (35 + 145 + 330)]
  const colX = colW.map((_, i) => tableLeft + colW.slice(0, i).reduce((a, b) => a + b, 0))
  const PADX = 6, PADY = 4
  const grid = (x0: number, y0: number, w: number, h: number) => doc.save().rect(x0, y0, w, h).lineWidth(0.5).strokeColor('#E5E0DB').stroke().restore()
  const drawRow = (cells: [string, Style][], rowTop: number, bg: string, header = false) => {
    const hs = cells.map(([t, st], i) => height(t, st, colW[i] - 2 * PADX))
    const rowH = Math.max(...hs) + 2 * PADY
    doc.save().rect(tableLeft, rowTop, tableW, rowH).fillColor(bg).fill().restore()
    cells.forEach(([t, st], i) => {
      const cellTop = rowTop + PADY + (rowH - 2 * PADY - hs[i]) / 2 // VALIGN MIDDLE
      text(t, colX[i] + PADX, cellTop, st, colW[i] - 2 * PADX, st.center ? 'center' : 'left')
      grid(colX[i], rowTop, colW[i], rowH)
    })
    void header
    return rowH
  }
  const rowHeight = (cells: [string, Style][]) => Math.max(...cells.map(([t, st], i) => height(t, st, colW[i] - 2 * PADX))) + 2 * PADY
  const head: [string, Style][] = [['#', ST.th], ['Member / Reader', ST.th], ['Book Title', ST.th], ['Author(s)', ST.th]]
  const rows = m.rows.map((r, i): [string, Style][] => [[String(i + 1), ST.idx], [r.member ?? 'General Discussion', ST.member], [r.title, ST.book], [r.author, ST.author]])

  // platypus: the table starts where it is only if the header and one row fit, otherwise it moves to the next frame
  const firstH = rows.length ? rowHeight(head) + rowHeight(rows[0]) : rowHeight(head)
  if (y + firstH > bottom) newPage()
  y += drawRow(head, y, '#14130F', true)
  rows.forEach((cells, i) => {
    const h = rowHeight(cells)
    if (y + h > bottom) { newPage(); y += drawRow(head, y, '#14130F', true) }
    y += drawRow(cells, y, (i + 1) % 2 === 0 ? '#FAF8F5' : '#FFFFFF')
  })

  // Footer on every page ("Page i of n"), like NumberedCanvas
  const total = pages.length
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i)
    const right = `Broke Bibliophiles Bangalore · Page ${i + 1} of ${total}`
    foot(doc, 'Archive Document · bbb-library', 36, false, W)
    foot(doc, right, W - 36, true, W)
  }
  return finish(doc, done)
}

function foot(doc: Doc, t: string, x: number, right: boolean, _w: number) {
  const size = 9
  const w = widthOf(doc, t, HELV, size)
  const asc = (doc as unknown as { _font: { ascender: number } })._font.ascender / 1000 * size
  doc.font(HELV).fontSize(size).fillColor('#8C8270')
  doc.text(t, right ? x - w : x, pageH(doc) - 20 - asc, { lineBreak: false })
}
