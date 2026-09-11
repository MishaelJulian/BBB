'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { CommandPalette } from '@/components/search/CommandPalette'

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLibraryRoom = pathname === '/library-room'

  if (isLibraryRoom) {
    return (
      <div className="min-h-screen w-screen bg-[#070504] overflow-hidden">
        {children}
        <CommandPalette />
      </div>
    )
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
