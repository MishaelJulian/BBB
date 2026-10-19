import { adminRoute } from '@/lib/handlers'
import { restoreMemberFull } from '@/lib/admin/members'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p) => restoreMemberFull(tx, who, decodeURIComponent(p.id)), { body: false })
