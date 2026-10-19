// Fetching cover images and group photos for the PDFs. Ported from pdf_generator.py (COVER_HOSTS, is_allowed_cover_url, download_and_cache_image)
// with the SSRF guards a server on the open internet needs: https only, allow-listed hosts, no credentials in the URL, no odd ports,
// every redirect hop checked again, private addresses refused, a timeout and a size cap.
import { lookup } from 'node:dns/promises'

// Same hosts as the Python COVER_HOSTS and the img-src list in next.config.ts. covers.openlibrary.org is not here because the Python allow-list never had it.
export const COVER_HOSTS = ['gr-assets.com', 'mzstatic.com', 'media-amazon.com', 'duckduckgo.com', 'tvmaze.com', 'ytimg.com', 'scdn.co']

export const COVER_MAX_BYTES = 2_500_000
export const COVER_TIMEOUT_MS = 8000
export const MAX_REDIRECTS = 3

function parse(url: unknown): URL | null {
  if (typeof url !== 'string' || url.length > 2048) return null
  try { return new URL(url) } catch { return null }
}

/** Same rule as is_allowed_cover_url, plus: no user:password@, default port only, host must be a real name (no IP, no trailing dot). */
export function isAllowedCoverUrl(url: unknown): boolean {
  const u = parse(url)
  if (!u || u.protocol !== 'https:') return false
  if (u.username || u.password || u.port) return false
  const host = u.hostname.toLowerCase()
  if (!host || host.endsWith('.') || /^[\d.]+$/.test(host) || host.includes(':')) return false
  return COVER_HOSTS.some((h) => host === h || host.endsWith('.' + h))
}

/**
 * The group photo of a meetup is ours: it must live in our own public photo bucket. `base` is NEXT_PUBLIC_SUPABASE_URL.
 * http is accepted only for a localhost base outside production (the test stub).
 */
export function isOwnPhotoUrl(url: unknown, base: string | undefined, bucket = 'meetup-photos', production = process.env.NODE_ENV === 'production'): boolean {
  const u = parse(url), b = parse(base)
  if (!u || !b) return false
  if (u.username || u.password) return false
  const local = ['localhost', '127.0.0.1'].includes(b.hostname)
  if (b.protocol !== 'https:' && !(local && !production)) return false
  if (u.origin !== b.origin) return false
  return u.pathname.startsWith(`/storage/v1/object/public/${bucket}/`) && !u.pathname.includes('..') && !u.pathname.includes('//')
}

/** IPv4/IPv6 addresses a public cover host must never resolve to. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase()
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
  if (mapped) return isPrivateIp(mapped[1])
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (v.includes(':')) return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || /^fe[89ab]/.test(v) || v.startsWith('ff')
  return true // not an address we understand
}

export type ImageKind = 'jpeg' | 'png' | 'gif' | 'webp'
export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif'
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

type Check = (u: URL) => boolean
export interface FetchOpts { check: Check; maxBytes?: number; timeoutMs?: number; resolve?: (host: string) => Promise<string[]>; fetchImpl?: typeof fetch }

const resolveAll = async (host: string) => (await lookup(host, { all: true })).map((r) => r.address)

/** Downloads an image with every guard on. Returns the raw bytes or null (never throws): a missing cover must not stop the PDF. */
export async function fetchImageBytes(url: string, opts: FetchOpts): Promise<Uint8Array | null> {
  const max = opts.maxBytes ?? COVER_MAX_BYTES
  const f = opts.fetchImpl ?? fetch
  const resolve = opts.resolve ?? resolveAll
  const signal = AbortSignal.timeout(opts.timeoutMs ?? COVER_TIMEOUT_MS)
  try {
    let cur = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = parse(cur)
      if (!u || !opts.check(u)) return null
      const local = ['localhost', '127.0.0.1'].includes(u.hostname)
      if (!local) {
        const addrs = await resolve(u.hostname)
        if (!addrs.length || addrs.some(isPrivateIp)) return null
      }
      const r = await f(u.toString(), { redirect: 'manual', signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BBB-library-pdf)', Accept: 'image/*' } })
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get('location')
        if (!loc) return null
        cur = new URL(loc, u).toString() // the next hop goes through the same checks
        continue
      }
      if (!r.ok || !r.body) return null
      const declared = Number(r.headers.get('content-length') ?? 0)
      if (declared > max) return null
      const chunks: Uint8Array[] = []
      let total = 0
      const reader = r.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.length
        if (total > max) { await reader.cancel().catch(() => {}); return null }
        chunks.push(value)
      }
      const out = new Uint8Array(total)
      let o = 0
      for (const c of chunks) { out.set(c, o); o += c.length }
      return sniffImage(out) ? out : null
    }
    return null
  } catch {
    return null
  }
}

export const fetchCover = (url: string | null | undefined, over: Partial<FetchOpts> = {}) =>
  url && isAllowedCoverUrl(url) ? fetchImageBytes(url, { check: (u) => isAllowedCoverUrl(u.toString()), ...over }) : Promise.resolve(null)
