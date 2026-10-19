// Meetups tool: list, group photo (Supabase Storage, public bucket, uploaded by this server with the service role key).
import { audit } from '../audit'
import { HttpError } from '../http'
import type { Caller } from '../session'
import type { Tx } from '../writes'

export const PHOTO_BUCKET = 'meetup-photos'
export const PHOTO_MAX = 4_718_592 // 4.5 MB: the Vercel request body limit

export interface MeetupRow { number: number; date: string | null; venue: string | null; readers: number; books: number; photo_url: string | null; pdf_url: string | null }

export async function listMeetups(tx: Tx): Promise<MeetupRow[]> {
  return tx<MeetupRow[]>`
    select m.meetup_number as number, m.date::text as date, v.name as venue, m.photo_url, m.pdf_url,
      (select count(*) from meetup_attendance a where a.meetup_id = m.id)::int as readers,
      (select count(distinct d.canonical_book_id) from discussions d where d.meetup_id = m.id)::int as books
    from meetups m left join venues v on v.id = m.venue_id order by m.meetup_number desc`
}

/** Sniff the real type from the first bytes; the content-type header and file name are not trusted. */
export function imageType(b: Uint8Array): { mime: string; ext: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  return null
}

async function storeFile(path: string, bytes: Uint8Array, mime: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) throw new HttpError(503, 'Photo storage is not set up yet (SUPABASE_SERVICE_ROLE_KEY is missing on the server).')
  const r = await fetch(`${base}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': mime, 'Cache-Control': 'max-age=3600', 'x-upsert': 'false' },
    body: bytes as unknown as BodyInit,
    signal: AbortSignal.timeout(20000),
  }).catch(() => null)
  if (!r || !r.ok) throw new HttpError(502, 'The photo could not be stored. Try again in a minute.')
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`
}

export async function uploadMeetupPhoto(tx: Tx, who: Caller, number: number, bytes: Uint8Array) {
  if (!bytes.length) throw new HttpError(422, 'No file was received.')
  if (bytes.length > PHOTO_MAX) throw new HttpError(413, 'That file is larger than 4.5 MB.')
  const t = imageType(bytes)
  if (!t) throw new HttpError(422, 'Use a JPG, PNG or WebP image.')
  const [m] = await tx<{ id: string; photo_url: string | null }[]>`select id, photo_url from meetups where meetup_number = ${number} for update`
  if (!m) throw new HttpError(404, `Meetup #${number} not found`)
  // A new name each time: the old file stays in the bucket, so removing or replacing a photo can be undone for 7 days.
  const url = await storeFile(`meetup-${number}-${Date.now()}.${t.ext}`, bytes, t.mime)
  await tx`update meetups set photo_url = ${url}, updated_at = now() where id = ${m.id}`
  await audit(tx, who, 'meetup.photo', 'meetups', m.id, { photo_url: m.photo_url }, { photo_url: url })
  return { success: true, photo_url: url, message: `Photo saved for meetup #${number}.` }
}

export async function removeMeetupPhoto(tx: Tx, who: Caller, number: number) {
  const [m] = await tx<{ id: string; photo_url: string | null }[]>`select id, photo_url from meetups where meetup_number = ${number} for update`
  if (!m) throw new HttpError(404, `Meetup #${number} not found`)
  if (!m.photo_url) throw new HttpError(409, 'This meetup has no photo.')
  await tx`update meetups set photo_url = null, updated_at = now() where id = ${m.id}`
  await audit(tx, who, 'meetup.photo', 'meetups', m.id, { photo_url: m.photo_url }, { photo_url: null })
  return { success: true, message: 'Photo removed. The file is kept, so you can bring it back for 7 days from All changes.' }
}
