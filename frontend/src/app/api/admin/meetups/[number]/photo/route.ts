import { HttpError } from '@/lib/http'
import { adminRawWrite } from '@/lib/admin/route'
import { PHOTO_MAX, removeMeetupPhoto, uploadMeetupPhoto } from '@/lib/admin/meetups'

export const dynamic = 'force-dynamic'

const num = (v: string) => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found'); return n }

// Accepts either raw image bytes OR multipart/form-data (`file` field), up to 4.5 MB.
export const POST = adminRawWrite<{ number: string }>(async (tx, who, p, req) => {
  const ct = req.headers.get('content-type') ?? ''
  let bytes: Uint8Array
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') throw new HttpError(422, 'No file was received.')
    bytes = new Uint8Array(await file.arrayBuffer())
  } else {
    const len = Number(req.headers.get('content-length') ?? 0)
    if (len > PHOTO_MAX + 1024) throw new HttpError(413, 'That file is larger than 4.5 MB.')
    bytes = new Uint8Array(await req.arrayBuffer())
  }
  if (bytes.length > PHOTO_MAX) throw new HttpError(413, 'That file is larger than 4.5 MB.')
  return uploadMeetupPhoto(tx, who, num(p.number), bytes)
})

export const DELETE = adminRawWrite<{ number: string }>((tx, who, p) => removeMeetupPhoto(tx, who, num(p.number)))
