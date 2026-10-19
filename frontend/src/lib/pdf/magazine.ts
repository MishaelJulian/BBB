// Magazine style: the Canva-look zine. Port of generate_magazine_meetup_pdf (app/services/pdf_generator.py), same coordinates (810 x 1012.5 pt,
// origin bottom-left), colours, wording and page order. Text is real text, in the same order, so app/parsers/pdf_parser.py can still read it.
import fs from 'node:fs'
import { formatMeetupDate, sanitizeFor, wrapText } from './format'
import type { PdfBook, PdfMeetup } from './data'
import { asset, Doc, drawString, fillRect, FONT_SPECIAL_ELITE as FONT, finish, NO_KERN, newDoc, pageH, type PdfResult, strokeRect, widthOf } from './doc'
import type { Prepared } from './images'

export const PAGE_WIDTH = 810
export const PAGE_HEIGHT = 1012.5
const BG_PARCHMENT = '#e1d1b9'
const TEXT_MAIN = '#14130F'
const AMBER_RULE = '#22201D'
const LEFT = 75
const USABLE = PAGE_WIDTH - 2 * LEFT
const BOTTOM_LIMIT = 320

export interface MagazineImages {
  /** cover image per URL; missing or failed = the drawn card */
  covers: Map<string, Prepared | null>
  /** the meetup's own group photo, if it has one and it could be fetched */
  photo: Prepared | null
}

/** Cover URLs that will actually be drawn, in drawing order (at most 3 per page), so only those are downloaded. */
export async function coverUrlsToFetch(m: PdfMeetup): Promise<string[]> {
  // Layout is computed by the same code as the drawing; a dry run (no images) gives the exact covers that will be drawn.
  const pages: PdfBook[][] = []
  await renderMagazine(m, { covers: new Map(), photo: null }, (pg) => pages.push(pg))
  const out: string[] = []
  for (const p of pages) for (const b of p) if (b.coverUrl && !out.includes(b.coverUrl)) out.push(b.coverUrl)
  return out
}

type FkFont = { unitsPerEm: number; layout(t: string, f?: unknown): { glyphs: { path: { toSVG(): string } }[]; positions: { xAdvance: number }[] }; hasGlyphForCodePoint(cp: number): boolean }
let fk: FkFont | null = null
function elite(): FkFont {
  if (!fk) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fontkit = require('fontkit') as { create: (b: Buffer) => FkFont }
    fk = fontkit.create(fs.readFileSync(asset('SpecialElite-Regular.ttf')))
  }
  return fk
}

/**
 * The drop shadow. The Python PDF drew the text twice (offset by 2 pt), which makes the text layer read "BBRROOKKEE" and hides
 * "Meetup #99" and the date from the PDF parser. Here the shadow is drawn as glyph outlines (same picture, no text), so the
 * foreground text is the only text on the page and can be read back.
 */
function shadowOutline(doc: Doc, text: string, x: number, baseline: number, size: number, color: string) {
  const f = elite()
  const run = f.layout(text, NO_KERN)
  const k = size / f.unitsPerEm
  let px = x
  doc.save().fillColor(color)
  run.glyphs.forEach((g, i) => {
    const svg = g.path.toSVG()
    if (svg) {
      doc.save().translate(px, pageH(doc) - baseline).scale(k, -k).path(svg).fill().restore()
    }
    px += run.positions[i].xAdvance * k
  })
  doc.restore()
}

function shadowText(doc: Doc, text: string, y: number, size: number, color = '#ffffff', shadow = '#1A1815', off = 2) {
  const safe = sanitizeFor(text, hasGlyph)
  const x = (PAGE_WIDTH - widthOf(doc, safe, FONT, size)) / 2
  shadowOutline(doc, safe, x + off, y - off, size, shadow)
  drawString(doc, safe, x, y, FONT, size, color)
}

const hasGlyph = (cp: number) => cp === 0x20 || elite().hasGlyphForCodePoint(cp)

/**
 * Draws the magazine. `onPageCovers` is called with the books whose covers sit at the bottom of each content page
 * (used by the planner and ignored when drawing for real).
 */
export function renderMagazine(m: PdfMeetup, img: MagazineImages, onPageCovers?: (books: PdfBook[]) => void): Promise<PdfResult> {
  const { doc, done } = newDoc([PAGE_WIDTH, PAGE_HEIGHT], { Title: `Broke Bibliophiles Bangalore - Meetup #${m.number}`, Author: 'Broke Bibliophiles Bangalore' })
  const dateStr = formatMeetupDate(m.date)
  const venue = m.venue
  const S = (t: string) => sanitizeFor(t, hasGlyph)
  const measure = (size: number) => (t: string) => widthOf(doc, t, FONT, size)

  const parchment = () => { doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 }); fillRect(doc, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG_PARCHMENT) }

  // PAGE 1: cover
  doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 })
  doc.image(asset('cover-bg.jpeg'), 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT })
  fillRect(doc, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, '#000000', 0.28)
  shadowText(doc, 'BROKE', 790, 76)
  shadowText(doc, 'BIBLIOPHILES', 705, 76)
  shadowText(doc, 'BANGALORE', 620, 76)
  shadowText(doc, `Meetup #${m.number}`, 260, 40)
  shadowText(doc, dateStr, 205, 30)
  shadowText(doc, `@${venue}`, 155, 30)

  const drawBottomCovers = (list: PdfBook[]) => {
    onPageCovers?.(list.slice(0, 3))
    if (!list.length) return
    const cw = 175, ch = 245, y = 45
    const n = Math.min(list.length, 3)
    const startX = (PAGE_WIDTH - (n * cw + (n - 1) * 35)) / 2
    list.slice(0, 3).forEach((b, i) => {
      const x = startX + i * (cw + 35)
      fillRect(doc, x + 3, y - 3, cw, ch, '#C9B79F')
      const pic = b.coverUrl ? img.covers.get(b.coverUrl) : null
      if (pic) {
        try {
          doc.image(pic.data, x, pageH(doc) - y - ch, { width: cw, height: ch })
          strokeRect(doc, x, y, cw, ch, '#8C7A65', 1)
          return
        } catch { /* draw the card below */ }
      }
      fillRect(doc, x, y, cw, ch, '#FDFBF7')
      strokeRect(doc, x, y, cw, ch, '#9C8A75', 1)
      let cy = y + ch - 40
      for (const l of wrapText(S(b.title), cw - 20, measure(12)).slice(0, 5)) { drawString(doc, l, x + 10, cy, FONT, 12, TEXT_MAIN); cy -= 16 }
      if (b.author) drawString(doc, `by ${S(b.author).slice(0, 22)}`, x + 10, y + 20, FONT, 10, '#555048')
    })
  }

  // PAGES 2..N: books by reader
  parchment()
  let cy = 930
  let pageCovers: PdfBook[] = []
  let counter = 1
  const newContentPage = () => { drawBottomCovers(pageCovers); parchment(); cy = 930; pageCovers = [] }
  for (const r of m.readers) {
    let need = 45
    let c = counter
    for (const b of r.books) { need += wrapText(S(`${c}. ${b.title}, by ${b.author}`), USABLE, measure(17)).length * 24 + 4; c++ }
    need += 20
    if (cy - need < BOTTOM_LIMIT) newContentPage()
    drawString(doc, S(r.name.toUpperCase()), LEFT, cy, FONT, 28, TEXT_MAIN)
    doc.save().moveTo(LEFT, pageH(doc) - (cy - 6)).lineTo(LEFT + 320, pageH(doc) - (cy - 6)).lineWidth(2.2).strokeColor(AMBER_RULE).stroke().restore()
    cy -= 38
    for (const b of r.books) {
      if (b.coverUrl && pageCovers.length < 3) pageCovers.push(b)
      for (const l of wrapText(S(`${counter}. ${b.title}, by ${b.author}`), USABLE, measure(17))) { drawString(doc, l, LEFT, cy, FONT, 17, TEXT_MAIN); cy -= 24 }
      cy -= 4
      counter++
    }
    cy -= 18
  }
  drawBottomCovers(pageCovers)

  // GENERAL DISCUSSION
  if (m.general.length) {
    parchment()
    cy = 930
    pageCovers = []
    drawString(doc, 'GENERAL DISCUSSION', LEFT, cy, FONT, 28, TEXT_MAIN)
    doc.save().moveTo(LEFT, pageH(doc) - (cy - 6)).lineTo(LEFT + 360, pageH(doc) - (cy - 6)).lineWidth(2.2).strokeColor(AMBER_RULE).stroke().restore()
    cy -= 38
    for (const b of m.general) {
      if (b.coverUrl && pageCovers.length < 3) pageCovers.push(b)
      const auth = b.author && b.author !== 'Unknown' ? `, by ${b.author}` : ''
      const lines = wrapText(S(`• ${b.title}${auth}`), USABLE, measure(16))
      if (cy - lines.length * 22 < BOTTOM_LIMIT) { drawBottomCovers(pageCovers); parchment(); cy = 930; pageCovers = [] }
      for (const l of lines) { drawString(doc, l, LEFT, cy, FONT, 16, TEXT_MAIN); cy -= 22 }
      cy -= 4
    }
    drawBottomCovers(pageCovers)
  }

  // GROUP PICTURE
  if (img.photo) {
    parchment()
    const centred = (t: string, y: number, size: number, color: string, shadow: string, off: number) => shadowText(doc, t, y, size, color, shadow, off)
    centred('THE BROKE BIBLIOPHILES', 930, 36, TEXT_MAIN, '#C9B79F', 1.5)
    centred(S(`MEETUP #${m.number} @ ${venue.toUpperCase()}`), 880, 24, '#4A443D', '#C9B79F', 1)
    const ratio = Math.min(680 / img.photo.width, 580 / img.photo.height)
    const rw = img.photo.width * ratio, rh = img.photo.height * ratio
    const px = (PAGE_WIDTH - rw) / 2, py = (PAGE_HEIGHT - rh) / 2 - 20
    fillRect(doc, px - 12 + 4, py - 12 - 4, rw + 24, rh + 24, '#B8A58D')
    fillRect(doc, px - 12, py - 12, rw + 24, rh + 24, '#FFFFFF')
    strokeRect(doc, px - 12, py - 12, rw + 24, rh + 24, '#DDD6C7', 1.5)
    doc.image(img.photo.data, px, pageH(doc) - py - rh, { width: rw, height: rh })
    centred(`Bangalore Chapter · ${dateStr}`, py - 45, 18, '#5A5248', '#ffffff', 1)
  }

  // CLOSING
  doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 })
  doc.image(asset('cover-bg.jpeg'), 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT })
  fillRect(doc, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, '#000000', 0.3)
  shadowText(doc, 'THANK YOU', 740, 70)
  shadowText(doc, 'FOR JOINING US!', 650, 62)
  shadowText(doc, `Meetup #${m.number}`, 260, 40)
  shadowText(doc, dateStr, 205, 30)
  shadowText(doc, `@${venue}`, 155, 30)

  return finish(doc, done)
}
