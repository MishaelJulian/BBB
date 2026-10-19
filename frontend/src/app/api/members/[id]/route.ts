import { apiError, ok, publicCache, route } from '@/lib/http'
import { getMemberDetail } from '@/lib/club/memberDetail'

export const dynamic = 'force-dynamic'

// By id, else by display name (case-insensitive). Default taken: a hidden member is a 404 for the public.
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params
  const member = await getMemberDetail(id)
  if (!member) return apiError(404, 'Member not found in archive')
  return ok(member, publicCache())
})
