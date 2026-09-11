'use client'

import * as React from 'react'
import { CriterionBookCloset } from '@/components/library/CriterionBookCloset'

export default function LibraryRoomPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#070504] flex items-center justify-center text-amber-200/70 font-serif text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="tracking-widest uppercase text-xs font-mono">Entering BBB Book Closet…</span>
          </div>
        </div>
      }
    >
      <CriterionBookCloset />
    </React.Suspense>
  )
}
