import { revalidatePath } from 'next/cache'
import { adminAction } from '@/lib/admin/route'

export const dynamic = 'force-dynamic'

// "Refresh site data": drops the cached pages and lists so recent changes show everywhere.
export const POST = adminAction(async () => {
  revalidatePath('/', 'layout')
  return { success: true, at: new Date().toISOString() }
})
