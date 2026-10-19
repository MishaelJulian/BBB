import { sql } from '@/lib/db'
import { listChanges, type ChangeType } from '@/lib/admin/changes'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

const TYPES = ['all', 'meetups', 'members', 'books', 'other']

// ?mine=1 limits to the caller's own changes. Every row says whether it can still be undone, and if not, why.
export const GET = adminGet((req, who) => {
  const u = req.nextUrl.searchParams
  const type = u.get('type') ?? 'all'
  return sql().begin((tx) =>
    listChanges(tx, {
      email: u.get('mine') === '1' ? who.email : null,
      limit: Number(u.get('limit')) || 50,
      offset: Number(u.get('offset')) || 0,
      type: (TYPES.includes(type) ? type : 'all') as ChangeType | 'all',
      q: u.get('q') ?? '',
    }),
  )
})
