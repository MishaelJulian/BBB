'use client'

import * as React from 'react'
import { getSession } from '@/lib/auth'

/** True only for a signed-in admin (role comes from app_metadata); false while loading and for everyone else. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = React.useState(false)
  React.useEffect(() => {
    getSession()
      .then((u) => setIsAdmin(u?.role === 'admin'))
      .catch(() => setIsAdmin(false))
  }, [])
  return isAdmin
}
