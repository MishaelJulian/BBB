import { NextRequest } from 'next/server'
import { caller, type Caller } from './session'

export type AdminCheck = { status: 'ok'; user: Caller } | { status: 'unauthenticated' } | { status: 'forbidden' }

/** Admin = a valid token whose app_metadata.role is 'admin'. */
export async function checkAdmin(req: NextRequest): Promise<AdminCheck> {
  const user = await caller(req)
  if (!user) return { status: 'unauthenticated' }
  return user.role === 'admin' ? { status: 'ok', user } : { status: 'forbidden' }
}
