import { NextRequest } from 'next/server'
import { caller, type Caller } from './session'

export type AdminCheck = { status: 'ok'; user: Caller } | { status: 'unauthenticated' } | { status: 'forbidden' }

/** Admin = a valid token whose app_metadata.role is 'admin'. */
export async function checkAdmin(req: NextRequest): Promise<AdminCheck> {
  const user = await caller(req)
  if (!user) return { status: 'unauthenticated' }
  return user.role === 'admin' ? { status: 'ok', user } : { status: 'forbidden' }
}

/** Route helper: the admin, or the ready-made 401 / 403 response to return. */
export async function requireAdmin(req: NextRequest): Promise<{ user: Caller } | { response: Response }> {
  const who = await checkAdmin(req)
  if (who.status === 'ok') return { user: who.user }
  const { apiError } = await import('./http')
  return { response: who.status === 'unauthenticated' ? apiError(401, 'Sign in to continue.', { 'Cache-Control': 'private, no-store' }) : apiError(403, 'Admin privileges required.', { 'Cache-Control': 'private, no-store' }) }
}
