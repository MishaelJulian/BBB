import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { ok, route } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Admins: members removed from the archive and still recoverable.
export const GET = route(async (req: NextRequest) => {
  const g = await requireAdmin(req)
  if ('response' in g) return g.response
  const rows = await sql()<{ id: string; display_name: string; removed_at: string | null; snap: string | null }[]>`
    select id, display_name, removed_at::text as removed_at, discussions_snapshot as snap from removed_members_archive order by removed_at desc`
  return ok(
    rows.map((r) => ({ id: r.id, display_name: r.display_name, removed_at: r.removed_at, book_count: r.snap ? (JSON.parse(r.snap) as unknown[]).length : 0 })),
    { 'Cache-Control': 'private, no-store' },
  )
})
