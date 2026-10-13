import { adminRoute } from '@/lib/handlers'
import { restoreMember } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p) => restoreMember(tx, who, decodeURIComponent(p.id)), { body: false })
