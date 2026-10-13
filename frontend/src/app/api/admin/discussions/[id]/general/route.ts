import { HttpError } from '@/lib/http'
import { adminRoute } from '@/lib/handlers'
import { toggleGeneral } from '@/lib/ops'

export const dynamic = 'force-dynamic'

export const PATCH = adminRoute<{ id: string }>((tx, who, p, body) => {
  if (typeof body.is_general_discussion !== 'boolean') throw new HttpError(422, 'is_general_discussion must be true or false.')
  return toggleGeneral(tx, who, p.id, body.is_general_discussion)
})
