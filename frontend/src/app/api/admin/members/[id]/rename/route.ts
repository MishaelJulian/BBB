import { adminRoute } from '@/lib/handlers'
import { renameMember } from '@/lib/admin/members'

export const dynamic = 'force-dynamic'

export const POST = adminRoute<{ id: string }>((tx, who, p, body) => renameMember(tx, who, decodeURIComponent(p.id), body.name))
