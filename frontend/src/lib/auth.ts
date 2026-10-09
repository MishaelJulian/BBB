/**
 * Login client for the BBB auth service (Better Auth, D5), reached same-origin at /api/auth.
 * Plain fetch keeps the frontend free of another dependency.
 */

export interface SessionUser {
  id: string
  email: string
  name: string
  role?: string | null
}

const AUTH = '/api/auth'

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(`${AUTH}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
}

async function messageOf(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return data?.message || data?.error?.message || fallback
  } catch {
    return fallback
  }
}

/** The signed-in user, or null. Throws only when the login service cannot be reached. */
export async function getSession(): Promise<SessionUser | null> {
  const res = await fetch(`${AUTH}/get-session`, { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) throw new Error('The login service is not reachable.')
  const data = await res.json()
  return data?.user ?? null
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await post('/sign-in/email', { email, password })
  if (!res.ok) throw new Error(await messageOf(res, 'Sign-in failed.'))
}

export async function signOut(): Promise<void> {
  await post('/sign-out')
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await post('/change-password', { currentPassword, newPassword, revokeOtherSessions: true })
  if (!res.ok) throw new Error(await messageOf(res, 'Could not change the password.'))
}
