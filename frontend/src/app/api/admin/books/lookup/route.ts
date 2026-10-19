import { lookupBook } from '@/lib/admin/enrich'
import { adminAction } from '@/lib/admin/route'
import { HttpError } from '@/lib/http'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Open Library, then Apple Books, from the server (the browser's CSP blocks those hosts). Returns what was found; writes nothing.
export const POST = adminAction(async (_req, _who, _p, body) => {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (title.length < 2) throw new HttpError(422, 'A title is required.')
  return lookupBook(title, typeof body.author === 'string' ? body.author.trim() : null)
})
