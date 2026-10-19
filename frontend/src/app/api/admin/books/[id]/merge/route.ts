import { adminRoute } from '@/lib/handlers'
import { mergeBooks } from '@/lib/admin/books'
import { HttpError } from '@/lib/http'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p, body) => {
  if (typeof body.into !== 'string' || !body.into) throw new HttpError(422, 'Say which book to merge into.')
  return mergeBooks(tx, who, p.id, body.into)
})
