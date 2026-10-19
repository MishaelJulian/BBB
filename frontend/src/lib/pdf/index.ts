// Builds a meetup PDF in memory: downloads the covers and the group photo (with the SSRF guards in covers.ts), then draws one of the two styles.
import fs from 'node:fs/promises'
import { asset } from './doc'
import { fetchCover, fetchImageBytes, isOwnPhotoUrl } from './covers'
import type { PdfMeetup } from './data'
import { prepareImage, type Prepared } from './images'
import { coverUrlsToFetch, renderMagazine } from './magazine'
import { renderClassic } from './classic'
import type { PdfResult } from './doc'

export type PdfStyle = 'magazine' | 'classic'
export const isStyle = (s: unknown): s is PdfStyle => s === 'magazine' || s === 'classic'

/** The Python generator fell back to the BBB #99 group photo when a meetup had none. Kept so the page count matches; see docs/ux/pdf-notes.md. */
export const FALLBACK_TO_TEMPLATE_PHOTO = true

export interface BuildInfo extends PdfResult { style: PdfStyle; coversWanted: number; coversLoaded: number; photo: 'own' | 'template' | 'none' }
export interface BuildOpts { fetchImpl?: typeof fetch; photoBase?: string; deadlineMs?: number; concurrency?: number }

async function pool<T>(items: string[], limit: number, until: number, fn: (x: string) => Promise<T>): Promise<Map<string, T | null>> {
  const out = new Map<string, T | null>()
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = items[i++]
      out.set(k, Date.now() > until ? null : await fn(k))
    }
  }))
  return out
}

export async function buildMeetupPdf(m: PdfMeetup, style: PdfStyle, opts: BuildOpts = {}): Promise<BuildInfo> {
  const until = Date.now() + (opts.deadlineMs ?? 25000)
  const base = opts.photoBase ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const over = { fetchImpl: opts.fetchImpl }

  let own: Prepared | null = null
  if (m.photoUrl && isOwnPhotoUrl(m.photoUrl, base)) {
    own = await prepareImage(await fetchImageBytes(m.photoUrl, { check: (u) => isOwnPhotoUrl(u.toString(), base), maxBytes: 5_000_000, timeoutMs: 10000, ...over }))
  }

  if (style === 'classic') {
    const r = await renderClassic(m, own)
    return { ...r, style, coversWanted: 0, coversLoaded: 0, photo: own ? 'own' : 'none' }
  }

  const wanted = await coverUrlsToFetch(m)
  const covers = await pool(wanted, opts.concurrency ?? 6, until, async (u) => prepareImage(await fetchCover(u, over)))
  let photo = own
  let kind: BuildInfo['photo'] = own ? 'own' : 'none'
  if (!photo && FALLBACK_TO_TEMPLATE_PHOTO) {
    photo = await prepareImage(await fs.readFile(asset('group-photo-fallback.jpeg')))
    kind = photo ? 'template' : 'none'
  }
  const r = await renderMagazine(m, { covers: covers as Map<string, Prepared | null>, photo })
  return { ...r, style, coversWanted: wanted.length, coversLoaded: [...covers.values()].filter(Boolean).length, photo: kind }
}
