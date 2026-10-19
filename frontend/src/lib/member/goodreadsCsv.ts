/** Parsing a Goodreads library export (CSV), in the browser. Only the "to-read" shelf is kept. */

export interface WishItem { title: string; author: string }

/** RFC 4180 style: quoted cells, doubled quotes, CR LF or LF, a leading byte order mark. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '')
  const out: string[][] = []
  let row: string[] = []
  let f = ''
  let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { f += '"'; i++ } else q = false
      } else f += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(f); f = ''
      out.push(row); row = []
    } else f += c
  }
  if (f || row.length) { row.push(f); out.push(row) }
  return out.filter((r) => r.some((x) => x.trim() !== ''))
}

/** Goodreads writes ISBNs as ="9780441013593" so spreadsheets keep the zeros. Not used for the wishlist, but cleaned in case it is. */
export const unwrapCell = (v: string) => (v.startsWith('="') ? v.slice(2).replace(/"$/, '') : v).trim()

/** "Dune (Dune Chronicles, #1)" becomes "Dune". Only a trailing bracket that holds a "#number" is a series suffix. */
export const stripSeries = (title: string) => title.replace(/\s*\([^()]*#\s*\d+(?:\.\d+)?[^()]*\)\s*$/, '').trim()

export type CsvResult = { ok: true; items: WishItem[]; skipped: number } | { ok: false; error: string }

export function goodreadsToRead(text: string): CsvResult {
  const rows = parseCsv(text)
  const h = rows[0] ?? []
  const ti = h.indexOf('Title')
  const ai = h.indexOf('Author')
  const si = h.indexOf('Exclusive Shelf')
  if (ti < 0) return { ok: false, error: 'This does not look like a Goodreads export. Check the file.' }
  const seen = new Set<string>()
  const items: WishItem[] = []
  let skipped = 0
  for (const r of rows.slice(1)) {
    const title = stripSeries(unwrapCell(r[ti] ?? ''))
    if (!title) continue
    if (si >= 0 && (r[si] ?? '').trim() !== 'to-read') { skipped++; continue }
    const author = ai < 0 ? '' : unwrapCell(r[ai] ?? '')
    const k = `${title.toLowerCase()}|${author.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    items.push({ title, author })
  }
  return { ok: true, items, skipped }
}
