import { sql } from '@/lib/db'
import { listBooks, type BookTab } from '@/lib/admin/books'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

export const GET = adminGet((req) => {
  const u = req.nextUrl.searchParams
  const tab = (['all', 'na', 'nc', 'ni'].includes(u.get('tab') ?? '') ? u.get('tab') : 'all') as BookTab
  return sql().begin((tx) => listBooks(tx, { tab, q: (u.get('q') ?? '').slice(0, 100), offset: Math.max(0, Number(u.get('offset')) || 0), limit: Math.min(100, Number(u.get('limit')) || 40) }))
})
