'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { CommandPalette } from '@/components/search/CommandPalette'

// The club pages bring their own shell (top bar, tab bar, footer: components/club/ClubPage). Only the pages that have not been
// ported yet keep the old navigation and footer.
const LEGACY = ['/admin', '/books', '/authors']

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const legacy = LEGACY.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!legacy) {
    return <div className="min-h-screen w-full overflow-x-hidden">{children}</div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-paper text-ink font-body antialiased">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
      <CommandPalette />
    </div>
  )
}
