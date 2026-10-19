import { sql } from '@/lib/db'
import { overview } from '@/lib/admin/overview'
import { adminGet } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

export const GET = adminGet(() => sql().begin((tx) => overview(tx)))
