import { adminRoute } from '@/lib/handlers'
import { revokeCode } from '@/lib/admin/members'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p) => revokeCode(tx, who, p.id), { body: false })
