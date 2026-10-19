import { sql } from '@/lib/db'
import { listCodes } from '@/lib/admin/members'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

// Issued invites. Only the hash is stored, so the code itself can never be shown again.
export const GET = adminGet(() => sql().begin((tx) => listCodes(tx)))
