import { sql } from '@/lib/db'
import { listMembers } from '@/lib/admin/members'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

export const GET = adminGet(() => sql().begin((tx) => listMembers(tx)))
