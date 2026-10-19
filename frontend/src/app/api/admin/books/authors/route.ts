import { sql } from '@/lib/db'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

// Author name suggestions for the book form.
export const GET = adminGet(async (req) => {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80)
  if (q.length < 2) return []
  const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
  return sql()<{ full_name: string }[]>`select full_name from authors where full_name ilike ${like} order by (lower(full_name) like ${q.toLowerCase() + '%'}) desc, full_name limit 6`
})
