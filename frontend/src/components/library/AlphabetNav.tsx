'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AlphabetNavProps {
  sections: string[]
  activeSection: string
  onSectionClick: (section: string) => void
  className?: string
}

export function AlphabetNav({
  sections,
  activeSection,
  onSectionClick,
  className,
}: AlphabetNavProps) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

  return (
    <nav
      className={cn('flex items-center gap-1 py-0.5 overflow-x-auto scrollbar-none', className)}
      aria-label="Alphabet catalog navigation"
    >
      <span className="hidden xl:inline text-[9px] font-mono uppercase tracking-[0.25em] text-amber-300/60 mr-1.5 shrink-0">
        INDEX:
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {alphabet.map((letter) => {
          const isActive = activeSection === letter
          const isAvailable = sections.includes(letter)

          return (
            <button
              key={letter}
              onClick={() => onSectionClick(letter)}
              disabled={!isAvailable}
              suppressHydrationWarning
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7 rounded-md text-[11px] font-serif transition-all flex items-center justify-center shrink-0',
                isActive
                  ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-black font-bold shadow-md scale-105 border border-amber-300/80'
                  : isAvailable
                    ? 'bg-black/40 hover:bg-amber-950/60 text-white/80 hover:text-white border border-amber-900/30 hover:border-amber-500/50'
                    : 'bg-transparent text-white/15 cursor-not-allowed border border-transparent'
              )}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`Jump to Section ${letter}`}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
