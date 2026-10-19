'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

/**
 * The floating bottom buttons (Filters, Import, Add a book). They are fixed, but the page's <main> is its own stacking
 * context, so on a short page the footer would sit over them. Drawing them as a child of the .club root, next to the
 * tab bar, keeps them on top and clickable.
 */
export function FloatPair({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) {
  const [root, setRoot] = React.useState<Element | null>(null)
  React.useEffect(() => setRoot(document.querySelector('.club')), [])
  if (!root || hidden) return null
  return createPortal(<div className="fpair right">{children}</div>, root)
}
