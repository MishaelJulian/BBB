import { adminRoute } from '@/lib/handlers'
import { deleteMember } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const DELETE = adminRoute<{ id: string }>((tx, who, p) => deleteMember(tx, who, decodeURIComponent(p.id)), { body: false })
