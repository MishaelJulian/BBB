import { NextRequest } from 'next/server'
import { checkAdmin } from '@/lib/admin'
import { apiError, ok, route } from '@/lib/http'
import { enrichSingleBookFromGoodreads } from '@/lib/goodreads'

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>(async (req: NextRequest, { params }) => {
  const who = await checkAdmin(req)
  if (who.status === 'unauthenticated') return apiError(401, 'Sign in to continue.')
  if (who.status === 'forbidden') return apiError(403, 'Admin privileges required.')
  const { id } = await params
  const res = await enrichSingleBookFromGoodreads(id, true)
  return ok(res, { 'Cache-Control': 'private, no-store' })
})
