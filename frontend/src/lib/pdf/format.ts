// Pure helpers for the meetup PDFs, ported from app/services/pdf_generator.py (format_meetup_date, wrap_text).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-08-23" -> "23rd August 2026". No date -> "2026" (the Python generator's fallback, kept so old and new PDFs read the same). */
export function formatMeetupDate(d: string | null | undefined): string {
  const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null
  if (!m) return '2026'
  const day = Number(m[3]), month = Number(m[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return '2026'
  const suffix = (day >= 4 && day <= 20) || (day >= 24 && day <= 30) ? 'th' : ['st', 'nd', 'rd'][(day % 10) - 1]
  return `${day}${suffix} ${MONTHS[month - 1]} ${Number(m[1])}`
}

/** Splits one word that is wider than the line into pieces that fit (what reportlab's Paragraph does for the classic table). */
function breakWord(w: string, maxWidth: number, measure: (s: string) => number): string[] {
  const parts: string[] = []
  let cur = ''
  for (const ch of w) {
    if (cur && measure(cur + ch) > maxWidth) { parts.push(cur); cur = ch } else cur += ch
  }
  if (cur) parts.push(cur)
  return parts
}

/**
 * Greedy word wrap on whitespace, like the Python wrap_text. By default a single word wider than the line stays on its own line
 * (magazine); with breakLong it is cut to fit (classic table cells).
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number, breakLong = false): string[] {
  const words = text.split(/\s+/).filter(Boolean).flatMap((w) => (breakLong && measure(w) > maxWidth ? breakWord(w, maxWidth, measure) : [w]))
  const lines: string[] = []
  let cur: string[] = []
  for (const w of words) {
    if (cur.length === 0 || measure(`${cur.join(' ')} ${w}`) <= maxWidth) cur.push(w)
    else { lines.push(cur.join(' ')); cur = [w] }
  }
  if (cur.length) lines.push(cur.join(' '))
  return lines
}

const WIN_ANSI_EXTRA = new Set([0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178])
/** True when the standard PDF fonts (Helvetica, WinAnsi) can show this code point. */
export const winAnsiHas = (cp: number) => (cp >= 0x20 && cp < 0x7f) || (cp >= 0xa0 && cp <= 0xff) || WIN_ANSI_EXTRA.has(cp)

/** A letter the font lacks but whose plain form it has (ū -> u) is drawn plain; any other run of missing characters (Malayalam, Bengali...) becomes one "?". Whitespace is collapsed. */
export function sanitizeFor(text: string, has: (cp: number) => boolean): string {
  let out = '', gap = false
  for (const ch of text.normalize('NFC').replace(/\s+/g, ' ')) {
    const cp = ch.codePointAt(0)!
    const base = has(cp) ? ch : ch.normalize('NFD')[0]
    if (has(base.codePointAt(0)!)) { out += base; gap = false } else if (!gap) { out += '?'; gap = true }
  }
  return out.trim()
}

/** reportlab's Paragraph treats text as markup; we draw text literally, so only whitespace is normalised. */
export const oneLine = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
