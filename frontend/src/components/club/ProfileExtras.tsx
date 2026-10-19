'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMe } from './useMe'

/** "Open in admin" for admins only. The server never trusts this: it only decides whether to show a link. */
export function AdminOpen({ href, label = 'Open in admin' }: { href: string; label?: string }) {
  const me = useMe()
  if (me.state !== 'admin') return null
  return (
    <p style={{ marginTop: 8 }}>
      <Link className="link" href={href}>{label}</Link>
    </p>
  )
}

/** On your own profile: a note and a way to edit the bio. The greeting comes from the linked record, never from editable metadata. */
export function YouNote({ memberId }: { memberId: string }) {
  const me = useMe()
  if (me.memberId !== memberId) return null
  return (
    <p className="you">
      This is your profile.<br />
      <Link className="link" href="/account">Edit your bio</Link>
    </p>
  )
}
