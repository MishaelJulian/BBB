import { adminRoute } from '@/lib/handlers'
import { makeMember } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p) => makeMember(tx, who, p.id), { body: false })
