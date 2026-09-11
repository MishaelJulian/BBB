'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Book } from '@/lib/api'
import { getBookPalette, getCatalogNumber } from './Book3D'

interface ClosetPicksTrayProps {
  picks: Book[]
  onRemovePick: (bookId: string) => void
  onSelectPick: (bookId: string) => void
  onSurpriseMe: () => void
  isOpen?: boolean
  onToggleOpen?: () => void
  className?: string
}

export function ClosetPicksTray({
  picks,
  onRemovePick,
  onSelectPick,
  onSurpriseMe,
  isOpen = false,
  onToggleOpen,
  className,
}: ClosetPicksTrayProps) {
  const maxSlots = 4

  return (
    <div className={cn('relative z-30 pointer-events-auto', className)}>
      {/* Floating Library Bag / Picks Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSurpriseMe}
          suppressHydrationWarning
          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-serif font-medium tracking-wide shadow-lg border border-amber-400/40 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
          title="Pick a random volume from the library stacks"
        >
          <span className="text-sm">🎲</span>
          <span>Surprise Me</span>
        </button>

        <button
          onClick={onToggleOpen}
          suppressHydrationWarning
          className={cn(
            'px-3 py-1.5 rounded-full border text-xs font-mono tracking-wider flex items-center gap-2 transition-all backdrop-blur-md',
            picks.length > 0
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-200 hover:bg-amber-900/80 shadow-md'
              : 'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          )}
        >
          <span>Library Bag</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-600/60 text-white text-[10px] font-bold">
            {picks.length}/{maxSlots}
          </span>
        </button>
      </div>

      {/* Expanded Closet Picks Drawer / Modal Tray */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-3 w-80 sm:w-96 p-4 rounded-2xl bg-[#14100D]/95 border border-amber-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-paper"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h4 className="font-display font-bold text-sm tracking-wider uppercase text-paper">
                  Your Library Bag
                </h4>
              </div>
              <span className="text-[11px] font-mono text-amber-200/60">
                {picks.length} of {maxSlots} Volumes
              </span>
            </div>

            {/* 4 Pick Slots */}
            <div className="grid grid-cols-4 gap-2.5 my-2">
              {Array.from({ length: maxSlots }).map((_, idx) => {
                const book = picks[idx]
                if (book) {
                  const palette = getBookPalette(book.title)
                  const catalogNo = getCatalogNumber(book.title, book.id)

                  return (
                    <div
                      key={`slot-filled-${book.id}`}
                      className="group relative flex flex-col items-center justify-between p-2 rounded-xl border border-white/10 hover:border-amber-400/60 transition-all cursor-pointer shadow-md"
                      style={{ backgroundColor: `${palette.bg}DD` }}
                      onClick={() => onSelectPick(book.id)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemovePick(book.id)
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 border border-white/20 text-white/60 hover:text-white hover:bg-red-900 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove volume"
                      >
                        ✕
                      </button>

                      <span className="text-[8px] font-mono opacity-75" style={{ color: palette.foil }}>
                        {catalogNo}
                      </span>
                      <p className="font-display text-[9px] font-bold text-center line-clamp-2 my-1.5 text-white">
                        {book.title}
                      </p>
                      <span className="text-[7px] uppercase font-serif text-amber-300/80">
                        View
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={`slot-empty-${idx}`}
                    className="h-24 rounded-xl border border-dashed border-white/15 bg-black/20 flex flex-col items-center justify-center p-2 text-center text-white/30"
                  >
                    <span className="text-xs mb-1">📖</span>
                    <span className="text-[9px] font-mono">Empty Slot</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-white/40 font-mono">
                Click heart on any book to add
              </span>
              <button
                onClick={onSurpriseMe}
                className="text-amber-400 hover:text-amber-300 font-serif underline decoration-amber-500/40"
              >
                Find random volume →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
