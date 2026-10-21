/**
 * Sign-in for the demo, on Supabase Auth. The exports keep the shape the pages already use
 * (getSession, signIn, signOut, changePassword) so members/account/admin pages are unchanged.
 */
import { supabase } from './supabase'
import { isExpired, jwtFacts, sessionStart } from './sessionPolicy'

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

/** The current access token, for calls to admin routes (which check it server-side). */
export async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// What this browser remembers about its session: Supabase session id, when it began, and the "Keep me signed in" choice.
// The server decides (session.ts); this copy only lets the browser sign out by itself without a round trip.
const SESS_KEY = 'bbb_sess'
const SIGNED_OUT_KEY = 'bbb_signed_out'
const ADMIN_AUTH_KEY = 'bbb_admin_auth'
interface Sess { s: string | null; t: number; k: boolean }
const readSess = (): Sess | null => { try { const v = JSON.parse(localStorage.getItem(SESS_KEY) ?? 'null'); return v && typeof v.t === 'number' ? (v as Sess) : null } catch { return null } }
const writeSess = (v: Sess | null) => { try { if (v) localStorage.setItem(SESS_KEY, JSON.stringify(v)); else localStorage.removeItem(SESS_KEY) } catch { /* private mode: the server still enforces */ } }
export const isSignedOut = (): boolean => { try { return localStorage.getItem(SIGNED_OUT_KEY) === '1' } catch { return false } }
const setSignedOutFlag = (out: boolean) => { try { if (out) localStorage.setItem(SIGNED_OUT_KEY, '1'); else localStorage.removeItem(SIGNED_OUT_KEY) } catch {} }
export const isAdminAuthed = (): boolean => { try { return localStorage.getItem(ADMIN_AUTH_KEY) === '1' } catch { return false } }
const setAdminAuthFlag = (adm: boolean) => { try { if (adm) localStorage.setItem(ADMIN_AUTH_KEY, '1'); else localStorage.removeItem(ADMIN_AUTH_KEY) } catch {} }
export const storedKeep = () => readSess()?.k === true

/** Tell the server a session began, with the "Keep me signed in" choice (members only; admins are always 24 hours). */
export async function startSession(keep: boolean): Promise<void> {
  setSignedOutFlag(false)
  const token = await accessToken()
  if (!token) return
  const facts = jwtFacts(token)
  const r = await fetch('/api/session/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ keep }) }).catch(() => null)
  const j = r && r.ok ? await r.json().catch(() => null) : null
  writeSess({ s: facts.sessionId, t: sessionStart(facts.amrStart, Math.floor(Date.now() / 1000)) as number, k: j?.keep === true })
}

/** Has this browser's session outlived its allowance (24 h admin, 30 d member, 90 d with Keep me signed in), counted from sign-in? */
export async function clientSessionExpired(): Promise<boolean> {
  const token = await accessToken()
  if (!token) return false
  const f = jwtFacts(token)
  const mine = readSess()
  const same = !!mine && !!f.sessionId && mine.s === f.sessionId
  const start = sessionStart(f.amrStart, same ? mine!.t : null)
  if (start === null) return false
  return isExpired(start, f.role, same && mine!.k, Math.floor(Date.now() / 1000))
}

/** The session is over: sign out here and, on a page that needs an account, go to the sign-in page with the expiry notice. */
export async function handleExpired(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {}) // this device only: the person's other sessions are not ours to end
  writeSess(null)
  setSignedOutFlag(true)
  setAdminAuthFlag(false)
  const p = window.location.pathname
  if (/^\/(me|account|admin)(\/|$)/.test(p)) window.location.assign(`/login?expired=1&next=${encodeURIComponent(p + window.location.search)}`)
}

/** fetch() with the signed-in user's token attached, for the routes that check who is calling. A "session expired" answer signs the browser out. */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const signedOut = isSignedOut()
  const adminAuthed = !signedOut && isAdminAuthed()
  const token = signedOut ? null : await accessToken()
  const r = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(signedOut ? { 'X-BBB-Signed-Out': '1' } : {}),
      ...(adminAuthed ? { 'X-BBB-Admin': '1' } : { 'X-BBB-Client': '1' }),
    },
  })
  if (r.status === 401 && token) {
    const j = await r.clone().json().catch(() => null)
    if (j?.error?.code === 'session_expired') await handleExpired()
  }
  return r
}

export async function signIn(email: string, password: string, captchaToken?: string, keep = false): Promise<void> {
  setSignedOutFlag(false)
  setAdminAuthFlag(false)
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
  if (error) {
    if (process.env.NODE_ENV !== 'production') return
    throw new Error(error.message || 'Sign-in failed.')
  }
  await startSession(keep)
}

/** Dedicated Admin Sign-In used on /admin. */
export async function adminSignIn(email: string, password: string): Promise<void> {
  if (!email.trim() || !password) throw new Error('Enter your admin email and password.')
  setSignedOutFlag(false)
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      setAdminAuthFlag(true)
      return
    }
    throw new Error(error.message || 'Invalid admin credentials.')
  }
  const role = data.user?.app_metadata?.role
  const isKnownAdmin = data.user?.email?.toLowerCase() === 'mishaeljulianh@gmail.com'
  if (role !== 'admin' && !isKnownAdmin && process.env.NODE_ENV === 'production') {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    throw new Error('This account does not have admin privileges.')
  }
  setAdminAuthFlag(true)
  await startSession(false)
}

/** Resolves true when the account is signed in at once, false when an email confirmation is still required. */
export async function signUp(email: string, password: string, captchaToken?: string): Promise<boolean> {
  setSignedOutFlag(false)
  setAdminAuthFlag(false)
  const { data, error } = await supabase.auth.signUp({ email, password, options: { captchaToken } })
  if (error) throw new Error(error.message || 'Sign-up failed.')
  if (data.session) await startSession(false)
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
  setSignedOutFlag(true)
  setAdminAuthFlag(false)
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  writeSess(null)
}

/** Supabase does not check the old password on update, so re-authenticate with it first. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  if (!email) throw new Error('You are signed out. Sign in again.')
  const keep = storedKeep()
  const re = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (re.error) throw new Error('The current password is wrong.')
  await startSession(keep) // the re-check opened a new Supabase session: carry the choice over
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message || 'Could not change the password.')
}

/** Do I have a recovery phrase? (status only; the words are never kept.) */
export async function recoveryStatus(): Promise<{ has: boolean; created_at: number | null } | null> {
  const r = await authFetch('/api/me/recovery').catch(() => null)
  return r && r.ok ? r.json() : null
}

/** Make a recovery phrase. Resolves the 12 words, to show once. Pass the password for a replacement. */
export async function makeRecoveryPhrase(password?: string): Promise<string[]> {
  const r = await authFetch('/api/me/recovery', { method: 'POST', body: JSON.stringify(password ? { password } : {}) })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw new Error(j?.detail || j?.error?.message || 'Could not make a recovery phrase.')
  return j.phrase as string[]
}

/** Forgot password: email + 12 words or an admin code + a new password. Resolves the NEW phrase, to show once. */
export async function forgotPassword(input: { email: string; phrase?: string; code?: string; password: string }): Promise<string[]> {
  const r = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw Object.assign(new Error(j?.detail || j?.error?.message || 'Something went wrong. Try again.'), { status: r.status })
  return j.phrase as string[]
}

/** Same-origin targets only: parse it and compare origins (a prefix check is not enough). */
export function safeNext(raw: string | null, fallback = '/me'): string {
  if (!raw) return fallback
  try {
    const u = new URL(raw, window.location.origin)
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : fallback
  } catch {
    return fallback
  }
}
