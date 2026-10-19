import { describe, expect, it } from 'vitest'
import { COVER_HOSTS, fetchCover, fetchImageBytes, isAllowedCoverUrl, isOwnPhotoUrl, isPrivateIp, sniffImage } from './covers'
import { groupBooks, isGeneralRow } from './data'
import { formatMeetupDate, oneLine, sanitizeFor, winAnsiHas, wrapText } from './format'
import { pdfKey } from '../admin/pdf'
import { buildMeetupPdf } from './index'
import type { PdfMeetup } from './data'

describe('formatMeetupDate (port of format_meetup_date)', () => {
  it.each([
    ['2026-08-23', '23rd August 2026'], ['2026-07-01', '1st July 2026'], ['2024-04-28', '28th April 2024'], ['2025-09-02', '2nd September 2025'],
    ['2025-10-11', '11th October 2025'], ['2025-10-12', '12th October 2025'], ['2025-10-13', '13th October 2025'], ['2025-01-21', '21st January 2025'],
    ['2025-01-22', '22nd January 2025'], ['2025-01-31', '31st January 2025'], ['2025-01-04', '4th January 2025'], ['2025-12-30', '30th December 2025'],
  ])('%s -> %s', (d, out) => expect(formatMeetupDate(d)).toBe(out))
  it('falls back to "2026" like the Python version', () => {
    expect(formatMeetupDate(null)).toBe('2026')
    expect(formatMeetupDate('')).toBe('2026')
    expect(formatMeetupDate('not a date')).toBe('2026')
    expect(formatMeetupDate('2025-13-40')).toBe('2026')
  })
})

describe('wrapText', () => {
  const m = (s: string) => s.length * 10
  it('wraps greedily on spaces', () => {
    expect(wrapText('aaa bbb ccc ddd', 70, m)).toEqual(['aaa bbb', 'ccc ddd'])
    expect(wrapText('  ', 70, m)).toEqual([])
    expect(wrapText('one', 70, m)).toEqual(['one'])
  })
  it('keeps a too-long word whole by default and cuts it when asked', () => {
    expect(wrapText('abcdefghij kk', 50, m)).toEqual(['abcdefghij', 'kk'])
    expect(wrapText('abcdefghij', 50, m, true)).toEqual(['abcde', 'fghij'])
  })
  it('collapses newlines and runs of spaces', () => expect(wrapText('a\n\nb   c', 1000, m)).toEqual(['a b c']))
})

describe('sanitizeFor', () => {
  const ascii = (cp: number) => cp >= 0x20 && cp < 0x7f
  it('keeps plain text, folds accents, replaces other scripts with one ?', () => {
    expect(sanitizeFor('Fūtarō Yamada', ascii)).toBe('Futaro Yamada')
    expect(sanitizeFor('Seven Moons (മലയാളം)', ascii)).toBe('Seven Moons (?)')
    expect(sanitizeFor('a\tb\n c', ascii)).toBe('a b c')
  })
  it('winAnsi accepts Latin-1 and typographic punctuation only', () => {
    expect(winAnsiHas('·'.codePointAt(0)!)).toBe(true)
    expect(winAnsiHas('’'.codePointAt(0)!)).toBe(true)
    expect(winAnsiHas('ū'.codePointAt(0)!)).toBe(false)
  })
  it('oneLine', () => expect(oneLine(' a\n b ')).toBe('a b'))
})

describe('cover URL allow-list (is_allowed_cover_url + SSRF cases)', () => {
  it('accepts https on the listed hosts and their subdomains', () => {
    for (const h of COVER_HOSTS) expect(isAllowedCoverUrl(`https://${h}/x.jpg`)).toBe(true)
    expect(isAllowedCoverUrl('https://i.gr-assets.com/images/S/x.jpg')).toBe(true)
    expect(isAllowedCoverUrl('https://is1-ssl.mzstatic.com/image/thumb/a.jpg')).toBe(true)
  })
  it.each([
    ['http (not https)', 'http://i.gr-assets.com/x.jpg'],
    ['lookalike suffix', 'https://evilgr-assets.com/x.jpg'],
    ['host as a prefix', 'https://gr-assets.com.evil.com/x.jpg'],
    ['userinfo trick: allowed name in the credentials', 'https://gr-assets.com@evil.com/x.jpg'],
    ['userinfo on an allowed host', 'https://user:pw@gr-assets.com/x.jpg'],
    ['non-default port', 'https://gr-assets.com:8443/x.jpg'],
    ['IPv4 literal', 'https://169.254.169.254/latest/meta-data'],
    ['IPv6 literal', 'https://[::1]/x.jpg'],
    ['localhost', 'https://localhost/x.jpg'],
    ['file scheme', 'file:///etc/passwd'],
    ['local path', '/etc/passwd'],
    ['data url', 'data:image/png;base64,AAAA'],
    ['javascript', 'javascript:alert(1)'],
    ['trailing dot host', 'https://i.gr-assets.com./x.jpg'],
    ['empty', ''],
    ['not a string', 42 as unknown as string],
    ['backslash trick', 'https://evil.com\\@gr-assets.com/x.jpg'],
  ])('refuses %s', (_n, u) => {
    expect(isAllowedCoverUrl(u)).toBe(false)
  })
  it('treats an explicit :443 as the default port', () => expect(isAllowedCoverUrl('https://gr-assets.com:443/x.jpg')).toBe(true))
  it('refuses very long URLs', () => expect(isAllowedCoverUrl('https://gr-assets.com/' + 'a'.repeat(3000))).toBe(false))
})

describe('own photo URL', () => {
  const base = 'https://abc.supabase.co'
  const ok = `${base}/storage/v1/object/public/meetup-photos/meetup-9-1.jpg`
  it('accepts only our bucket on our project', () => {
    expect(isOwnPhotoUrl(ok, base)).toBe(true)
    expect(isOwnPhotoUrl(ok.replace('abc', 'evil'), base)).toBe(false)
    expect(isOwnPhotoUrl(`${base}/storage/v1/object/public/meetup-pdfs/x.pdf`, base)).toBe(false)
    expect(isOwnPhotoUrl(`${base}/storage/v1/object/public/meetup-photos/../../x`, base)).toBe(false)
    expect(isOwnPhotoUrl(`https://user@abc.supabase.co/storage/v1/object/public/meetup-photos/a.jpg`, base)).toBe(false)
    expect(isOwnPhotoUrl(ok, undefined)).toBe(false)
    expect(isOwnPhotoUrl('https://abc.supabase.co.evil.com/storage/v1/object/public/meetup-photos/a.jpg', base)).toBe(false)
  })
  it('allows http only for a localhost base outside production', () => {
    const local = 'http://127.0.0.1:58731'
    expect(isOwnPhotoUrl(`${local}/storage/v1/object/public/meetup-photos/a.jpg`, local, 'meetup-photos', false)).toBe(true)
    expect(isOwnPhotoUrl(`${local}/storage/v1/object/public/meetup-photos/a.jpg`, local, 'meetup-photos', true)).toBe(false)
    expect(isOwnPhotoUrl('http://abc.supabase.co/storage/v1/object/public/meetup-photos/a.jpg', 'http://abc.supabase.co', 'meetup-photos', false)).toBe(false)
  })
})

describe('private addresses', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'garbage'])('%s is private', (ip) => expect(isPrivateIp(ip)).toBe(true))
  it.each(['8.8.8.8', '172.32.0.1', '151.101.1.1', '2606:4700::1111', '::ffff:8.8.8.8'])('%s is public', (ip) => expect(isPrivateIp(ip)).toBe(false))
})

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
const resp = (status: number, body: Uint8Array | null, headers: Record<string, string> = {}) =>
  new Response(body as unknown as BodyInit, { status, headers })

describe('fetching covers with every guard on', () => {
  const pub = async () => ['151.101.1.1']
  it('returns the bytes of an allowed image', async () => {
    const f = (async () => resp(200, JPEG)) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: f, resolve: pub })).toEqual(JPEG)
  })
  it('never calls fetch for a refused URL', async () => {
    let calls = 0
    const f = (async () => { calls++; return resp(200, JPEG) }) as unknown as typeof fetch
    for (const u of ['http://i.gr-assets.com/a.jpg', 'https://evil.com/a.jpg', 'https://169.254.169.254/', 'https://gr-assets.com@evil.com/a.jpg', null, undefined]) expect(await fetchCover(u, { fetchImpl: f, resolve: pub })).toBeNull()
    expect(calls).toBe(0)
  })
  it('refuses a redirect to an internal host or a non-https URL', async () => {
    const seen: string[] = []
    const f = (async (u: string) => { seen.push(u); return resp(302, null, { location: 'http://169.254.169.254/latest/meta-data' }) }) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: f, resolve: pub })).toBeNull()
    expect(seen).toEqual(['https://i.gr-assets.com/a.jpg'])
    const g = (async () => resp(302, null, { location: 'https://evil.example.com/a.jpg' })) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: g, resolve: pub })).toBeNull()
    const h = (async () => resp(301, null, { location: 'https://gr-assets.com@evil.com/a.jpg' })) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: h, resolve: pub })).toBeNull()
  })
  it('follows a redirect that stays on an allowed host, but not forever', async () => {
    let n = 0
    const f = (async () => (n++ === 0 ? resp(302, null, { location: '/b.jpg' }) : resp(200, JPEG))) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: f, resolve: pub })).toEqual(JPEG)
    const loop = (async () => resp(302, null, { location: 'https://i.gr-assets.com/again.jpg' })) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: loop, resolve: pub })).toBeNull()
  })
  it('refuses an allowed name that resolves to a private address (DNS rebinding)', async () => {
    let calls = 0
    const f = (async () => { calls++; return resp(200, JPEG) }) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: f, resolve: async () => ['10.0.0.5'] })).toBeNull()
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: f, resolve: async () => ['8.8.8.8', '127.0.0.1'] })).toBeNull()
    expect(calls).toBe(0)
  })
  it('refuses a body over the size cap (declared or streamed) and non-images', async () => {
    const big = new Uint8Array(3000); big.set(JPEG)
    const declared = (async () => resp(200, big, { 'content-length': '999999999' })) as unknown as typeof fetch
    expect(await fetchImageBytes('https://i.gr-assets.com/a.jpg', { check: (u) => isAllowedCoverUrl(u.toString()), fetchImpl: declared, resolve: pub, maxBytes: 1000 })).toBeNull()
    const streamed = (async () => resp(200, big)) as unknown as typeof fetch
    expect(await fetchImageBytes('https://i.gr-assets.com/a.jpg', { check: (u) => isAllowedCoverUrl(u.toString()), fetchImpl: streamed, resolve: pub, maxBytes: 1000 })).toBeNull()
    const html = (async () => resp(200, new TextEncoder().encode('<html>no</html>'))) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: html, resolve: pub })).toBeNull()
  })
  it('gives up quietly on errors, 404s and timeouts', async () => {
    const boom = (async () => { throw new Error('network') }) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: boom, resolve: pub })).toBeNull()
    const nf = (async () => resp(404, null)) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: nf, resolve: pub })).toBeNull()
    const slow = ((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch
    expect(await fetchCover('https://i.gr-assets.com/a.jpg', { fetchImpl: slow, resolve: pub, timeoutMs: 30 })).toBeNull()
  })
  it('sniffImage', () => {
    expect(sniffImage(JPEG)).toBe('jpeg')
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
  })
})

describe('grouping (same rules as the Python generator)', () => {
  const b = (bookId: string, member: string | null, isGeneral = false) => ({ bookId, title: bookId, author: 'A', coverUrl: null, member, isGeneral })
  it('groups by reader A-Z, general books once, no-reader books are general', () => {
    const g = groupBooks([b('1', 'Zed'), b('2', 'amy'), b('3', 'Zed'), b('4', null), b('4', null), b('5', 'Amy', true), b('6', 'Bob')])
    expect(g.readers.map((r) => r.name)).toEqual(['Bob', 'Zed', 'amy'])
    expect(g.readers.find((r) => r.name === 'Zed')!.books.map((x) => x.title)).toEqual(['1', '3'])
    expect(g.general.map((x) => x.title)).toEqual(['4', '5'])
  })
  it('a row is general when notes or topic mention "general"', () => {
    expect(isGeneralRow('General discussion', null)).toBe(true)
    expect(isGeneralRow(null, 'GENERAL')).toBe(true)
    expect(isGeneralRow('tangent', 'books')).toBe(false)
  })
})

describe('storage key', () => {
  it('is built from a number, a whitelisted style and the clock only', () => {
    expect(pdfKey(99, 'magazine', 1760000000000)).toBe('meetup-99-magazine-1760000000000.pdf')
    expect(pdfKey(7, 'classic', 5)).toMatch(/^meetup-7-classic-5\.pdf$/)
  })
})

describe('building a PDF in memory', () => {
  const book = (i: number, member: string | null, general = false) => ({ title: `Book number ${i}, with a fairly long title to wrap`, author: `Author ${i}`, coverUrl: null, member, isGeneral: general })
  const rows = Array.from({ length: 30 }, (_, i) => book(i, i % 3 ? `Reader ${i % 4}` : null))
  const mk = (over: Partial<PdfMeetup> = {}): PdfMeetup => {
    const withId = rows.map((r, i) => ({ ...r, bookId: String(i) }))
    const { readers, general } = groupBooks(withId)
    return { id: 'x', number: 7, date: '2025-03-02', venue: 'Somewhere', description: null, photoUrl: null, pdfUrl: null, rows, readers, general, ...over }
  }
  it('makes a real PDF in both styles, with a missing cover and no photo', async () => {
    const mag = await buildMeetupPdf(mk(), 'magazine')
    expect(Buffer.from(mag.bytes.subarray(0, 5)).toString()).toBe('%PDF-')
    expect(mag.pages).toBeGreaterThanOrEqual(4) // cover, readers, general, group photo (template), closing
    expect(mag.photo).toBe('template')
    const cls = await buildMeetupPdf(mk(), 'classic')
    expect(Buffer.from(cls.bytes.subarray(0, 5)).toString()).toBe('%PDF-')
    expect(cls.pages).toBeGreaterThanOrEqual(1)
  })
  it('survives a meetup with no books in the groups, no date and odd characters', async () => {
    const odd = mk({ date: null, readers: [], general: [], rows: [{ ...book(1, null), title: 'മലയാളം <b>&amp;</b> ū' }] })
    await expect(buildMeetupPdf(odd, 'magazine')).resolves.toBeTruthy()
    await expect(buildMeetupPdf(odd, 'classic')).resolves.toBeTruthy()
  })
})

// The route's operation, against the throwaway local database only (it writes meetups.pdf_url and an audit row there).
import { afterAll, beforeAll, vi } from 'vitest'
import { makeMeetupPdf } from '../admin/pdf'
import { sql } from '../db'

const local = /127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? '')
describe.skipIf(!local)('makeMeetupPdf (local database, stubbed storage)', () => {
  const who = { id: '11111111-1111-1111-1111-111111111111', email: 'test-admin@bbb.test', role: 'admin' } as never
  const keep = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  let before: string | null = null
  beforeAll(async () => { before = (await sql()`select pdf_url from meetups where meetup_number = 71`)[0].pdf_url })
  afterAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = keep.url; process.env.SUPABASE_SERVICE_ROLE_KEY = keep.key
    vi.restoreAllMocks()
    await sql()`update meetups set pdf_url = ${before} where meetup_number = 71`
    await sql().end()
  })
  const status = (p: Promise<unknown>) => p.then(() => 0, (e: { status?: number }) => e.status ?? -1)

  it('answers 422 for a bad style, 404 for an unknown meetup', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'
    expect(await status(makeMeetupPdf(who, 71, 'zip'))).toBe(422)
    expect(await status(makeMeetupPdf(who, 71, null))).toBe(422)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    expect(await status(makeMeetupPdf(who, 987654, 'classic'))).toBe(404)
  })
  it('answers 503 when the service key is missing, and nothing is written', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(await status(makeMeetupPdf(who, 71, 'classic'))).toBe(503)
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'
  })
  it('answers 503 when storage refuses, leaving pdf_url alone', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))
    expect(await status(makeMeetupPdf(who, 71, 'classic'))).toBe(503)
    expect((await sql()`select pdf_url from meetups where meetup_number = 71`)[0].pdf_url).toBe(before)
  })
  it('stores under a fresh key, never overwriting, then sets pdf_url and writes the audit row', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{}', { status: 200 }) }) as never)
    const r = await makeMeetupPdf(who, 71, 'classic')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toMatch(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/meetup-pdfs\/meetup-71-classic-\d+\.pdf$/)
    expect((calls[0].init.headers as Record<string, string>)['x-upsert']).toBe('false')
    expect(r.pdf_url).toMatch(/\/storage\/v1\/object\/public\/meetup-pdfs\/meetup-71-classic-\d+\.pdf$/)
    const [m] = await sql()`select pdf_url from meetups where meetup_number = 71`
    expect(m.pdf_url).toBe(r.pdf_url)
    const [a] = await sql()`select before, after from audit_log where action = 'meetup.pdf' order by at desc limit 1`
    expect(a.before.pdf_url).toBe(before)
    expect(a.after.pdf_url).toBe(r.pdf_url)
  })
})
