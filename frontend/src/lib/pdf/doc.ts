// pdfkit plumbing shared by both styles: document creation, fonts and the reportlab-style coordinate helpers (origin bottom-left, y = baseline).
import path from 'node:path'
import PDFDocument from 'pdfkit'

const ASSET_DIR = path.join(process.cwd(), 'src', 'lib', 'pdf', 'assets')
export const asset = (name: string) => path.join(ASSET_DIR, name)
export const FONT_SPECIAL_ELITE = 'SpecialElite'

// reportlab does not kern; switching it off keeps line breaks and widths the same as the Python PDFs (TrueType fonts; for the standard fonts the AFM kern table is emptied in newDoc).
export const NO_KERN = { kern: false } as never

export type Doc = PDFKit.PDFDocument

export interface PdfResult { bytes: Buffer; pages: number }

export function newDoc(size: [number, number], info: { Title: string; Author: string }): { doc: Doc; done: Promise<Buffer> } {
  const doc = new PDFDocument({ size, margin: 0, autoFirstPage: false, bufferPages: true, compress: true, info: { ...info, Producer: 'bbb-library', Creator: 'bbb-library' } })
  doc.registerFont(FONT_SPECIAL_ELITE, asset('SpecialElite-Regular.ttf'))
  // Standard Helvetica fonts: drop the AFM kern pairs (private field; if pdfkit changes, kerning simply stays on).
  for (const f of ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique']) {
    const afm = (doc.font(f) as unknown as { _font?: { font?: { kernPairs?: Record<string, number> } } })._font?.font
    if (afm?.kernPairs) afm.kernPairs = {}
  }
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject) })
  return { doc, done }
}

export const pageH = (doc: Doc) => doc.page.height

/** Baseline distance below the top of a text line in pdfkit for the current font. */
const ascender = (doc: Doc) => ((doc as unknown as { _font: { ascender: number } })._font.ascender / 1000) * (doc as unknown as { _fontSize: number })._fontSize

/** drawString: left edge x, baseline y measured from the bottom of the page (reportlab convention). */
export function drawString(doc: Doc, text: string, x: number, baseline: number, font: string, size: number, color: string) {
  doc.font(font).fontSize(size).fillColor(color)
  doc.text(text, x, pageH(doc) - baseline - ascender(doc), { lineBreak: false, features: NO_KERN })
}

export function widthOf(doc: Doc, text: string, font: string, size: number): number {
  return doc.font(font).fontSize(size).widthOfString(text, { features: NO_KERN })
}

/** Rectangle given reportlab-style (x, y of the bottom-left corner). */
export function rectBL(doc: Doc, x: number, y: number, w: number, h: number) {
  return doc.rect(x, pageH(doc) - y - h, w, h)
}
export const fillRect = (doc: Doc, x: number, y: number, w: number, h: number, color: string, opacity = 1) => {
  doc.save()
  rectBL(doc, x, y, w, h).fillColor(color).fillOpacity(opacity).fill()
  doc.restore()
}
export const strokeRect = (doc: Doc, x: number, y: number, w: number, h: number, color: string, width: number) => {
  doc.save()
  rectBL(doc, x, y, w, h).lineWidth(width).strokeColor(color).stroke()
  doc.restore()
}

/** Ends the document and resolves with the bytes and the page count. */
export function finish(doc: Doc, done: Promise<Buffer>): Promise<PdfResult> {
  const pages = doc.bufferedPageRange().count
  doc.end()
  return done.then((bytes) => ({ bytes, pages }))
}
