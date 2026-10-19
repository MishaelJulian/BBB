'use client'

import * as React from 'react'

export type MeState = 'loading' | 'out' | 'new' | 'member' | 'admin'
export interface Me {
  state: MeState
  /** Name from the linked member record (never from editable user_metadata). */
  name: string | null
  memberId: string | null
  email: string | null
  role: string | null
}

const OUT: Me = { state: 'out', name: null, memberId: null, email: null, role: null }
let cache: Me | null = null
let inflight: Promise<Me> | null = null
const listeners = new Set<(m: Me) => void>()

async function load(): Promise<Me> {
  // the auth library is about 50 kB: it is fetched here, after the page has painted, not with the first script
  const [{ supabase }, { authFetch, clientSessionExpired, handleExpired }] = await Promise.all([import('@/lib/supabase'), import('@/lib/auth')])
  const { data } = await supabase.auth.getSession()
  if (!data.session) return OUT
  // Session lengths, counted from sign-in (the server checks the same thing on every call): over the allowance means signed out.
  if (await clientSessionExpired()) {
    await handleExpired()
    return OUT
  }
  const r = await authFetch('/api/me').catch(() => null)
  if (!r || !r.ok) return OUT
  const j = (await r.json()) as { user: { email: string; role: string | null }; member: { id: string; display_name: string } | null }
  const role = j.user.role
  return {
    state: role === 'admin' ? 'admin' : j.member ? 'member' : 'new',
    name: j.member?.display_name ?? null,
    memberId: j.member?.id ?? null,
    email: j.user.email,
    role,
  }
}

export function refreshMe(): Promise<Me> {
  inflight = load().then((m) => {
    cache = m
    listeners.forEach((l) => l(m))
    return m
  })
  return inflight
}

let wired = false
async function wire() {
  if (wired) return
  wired = true
  const { supabase } = await import('@/lib/supabase')
  supabase.auth.onAuthStateChange(() => {
    void refreshMe()
  })
}

/** Who is looking at the page: signed out, signed in without a record, member, or admin. */
export function useMe(): Me {
  const [me, setMe] = React.useState<Me>(cache ?? { state: 'loading', name: null, memberId: null, email: null, role: null })
  React.useEffect(() => {
    void wire()
    listeners.add(setMe)
    if (cache) setMe(cache)
    else void (inflight ?? refreshMe())
    return () => {
      listeners.delete(setMe)
    }
  }, [])
  return me
}
