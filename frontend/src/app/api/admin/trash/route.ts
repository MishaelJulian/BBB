import { sql } from '@/lib/db'
import { listTrash } from '@/lib/admin/trash'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

export const GET = adminGet((req) => {
  const kind = req.nextUrl.searchParams.get('kind') === 'book' ? 'book' : 'meetup'
  return sql().begin((tx) => listTrash(tx, kind))
})
