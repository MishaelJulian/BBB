import { HttpError } from '@/lib/http'
import { adminRawWrite } from '@/lib/admin/route'
import { PHOTO_MAX, removeMeetupPhoto, uploadMeetupPhoto } from '@/lib/admin/meetups'

export const dynamic = 'force-dynamic'

const num = (v: string) => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(404, 'Meetup not found'); return n }

// The raw image bytes are the request body (jpg, png or webp, up to 4.5 MB). The type is checked from the bytes, not the name.
export const POST = adminRawWrite<{ number: string }>(async (tx, who, p, req) => {
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > PHOTO_MAX + 1024) throw new HttpError(413, 'That file is larger than 4.5 MB.')
  const bytes = new Uint8Array(await req.arrayBuffer())
  return uploadMeetupPhoto(tx, who, num(p.number), bytes)
})

export const DELETE = adminRawWrite<{ number: string }>((tx, who, p) => removeMeetupPhoto(tx, who, num(p.number)))
