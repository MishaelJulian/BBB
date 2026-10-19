// Session lengths, as pure arithmetic shared by the server (session.ts) and the browser (useMe.ts).
// Allowance is measured from SIGN-IN time, never from a token refresh.

export const DAY = 86400
export const ADMIN_ALLOWANCE = 1 * DAY
export const MEMBER_ALLOWANCE = 30 * DAY
export const KEEP_ALLOWANCE = 90 * DAY
/** "Keep me signed in" can only be set this long after the session began. */
export const KEEP_WINDOW = 600
/** The first recovery phrase may be made without the password only this soon after sign-in. */
export const FRESH_WINDOW = 1800
export const SESSION_EXPIRED_MESSAGE = 'Your previous session has expired. Sign in again.'

export interface JwtFacts {
  sessionId: string | null
  /** Earliest `amr` timestamp (Unix seconds): when the login method was used. Null when the token has none. */
  amrStart: number | null
  role: string | null
}

/** Read the claims we need from a JWT that Supabase has ALREADY vouched for (or, in the browser, our own stored session). Never trusts user_metadata. */
export function jwtFacts(token: string): JwtFacts {
  const empty: JwtFacts = { sessionId: null, amrStart: null, role: null }
  const part = token.split('.')[1]
  if (!part) return empty
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const bin = atob(b64)
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as {
      session_id?: unknown
      amr?: unknown
      app_metadata?: { role?: unknown }
    }
    const stamps = Array.isArray(p.amr)
      ? (p.amr as { timestamp?: unknown }[]).map((a) => a?.timestamp).filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0)
      : []
    return {
      sessionId: typeof p.session_id === 'string' ? p.session_id : null,
      amrStart: stamps.length ? Math.min(...stamps) : null,
      role: typeof p.app_metadata?.role === 'string' ? p.app_metadata.role : null,
    }
  } catch {
    return empty
  }
}

export function allowanceSeconds(role: string | null, keep: boolean): number {
  if (role === 'admin') return ADMIN_ALLOWANCE
  return keep ? KEEP_ALLOWANCE : MEMBER_ALLOWANCE
}

/** The earliest of the start times we know; null if we know none. */
export function sessionStart(...times: (number | null | undefined)[]): number | null {
  const t = times.filter((x): x is number => typeof x === 'number' && x > 0)
  return t.length ? Math.min(...t) : null
}

export function isExpired(start: number, role: string | null, keep: boolean, now: number): boolean {
  return now - start > allowanceSeconds(role, keep)
}
