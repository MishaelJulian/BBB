/**
 * Sign-in for the demo, on Supabase Auth. The exports keep the shape the pages already use
 * (getSession, signIn, signOut, changePassword) so members/account/admin pages are unchanged.
 */
import { supabase } from './supabase'

export interface SessionUser {
  id: string
  email: string
  name: string
  role?: string | null
}

// Authorisation data lives in app_metadata (only the server can write it). user_metadata is user-editable: never trust it for roles.
function toUser(u: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): SessionUser {
  const role = u.app_metadata?.role
  return {
    id: u.id,
    email: u.email ?? '',
    name: String(u.user_metadata?.name ?? u.user_metadata?.full_name ?? u.email ?? ''),
    role: typeof role === 'string' ? role : null,
  }
}

/** The signed-in user, or null. Verifies the token with Supabase; throws only when Supabase cannot be reached. */
export async function getSession(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  const { data: u, error } = await supabase.auth.getUser()
  if (error) {
    if (error.status && error.status >= 400 && error.status < 500) return null // expired or revoked
    throw new Error('The login service is not reachable.')
  }
  return u.user ? toUser(u.user) : null
}

export async function signIn(email: string, password: string, captchaToken?: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
  if (error) throw new Error(error.message || 'Sign-in failed.')
}

/** Resolves true when the account is signed in at once, false when an email confirmation is still required. */
export async function signUp(email: string, password: string, captchaToken?: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { captchaToken } })
  if (error) throw new Error(error.message || 'Sign-up failed.')
  return Boolean(data.session)
}

export async function signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/account` } })
  if (error) throw new Error(error.message)
}

/** Provider buttons show only for providers named in NEXT_PUBLIC_OAUTH_PROVIDERS (set once they are configured in Supabase). */
export const oauthProviders = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? '')
  .split(',')
  .map((p) => p.trim())
  .filter((p): p is 'google' | 'apple' => p === 'google' || p === 'apple')

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** Supabase does not check the old password on update, so re-authenticate with it first. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  if (!email) throw new Error('You are signed out. Sign in again.')
  const re = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (re.error) throw new Error('The current password is wrong.')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message || 'Could not change the password.')
}
