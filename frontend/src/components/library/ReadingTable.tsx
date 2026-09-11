'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Book } from '@/lib/api'
import { formatDate } from '@/lib/utils'

// Library-inspired color palette
const COVER_COLORS = [
  '#2D4A3E', '#1E3A5F', '#6B2D3E', '#5C1A1A', '#4A3728',
  '#2D2D2D', '#3D2B4F', '#1A3D3D', '#3D5A6E', '#6B2D2D',
]

function getCoverColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length]
}

interface ReadingTableProps {
  book: Book
  isSelected?: boolean
  onReturnToShelf?: () => void
  className?: string
}

export function ReadingTable({
  book,
  isSelected = false,
  onReturnToShelf,
  className,
}: ReadingTableProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const coverColor = getCoverColor(book.title)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
      id="reading-table"
    >
      {/* Section header & Brass Plaque */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/20 border border-amber-800/30 text-amber-900/80 dark:text-amber-200/80 text-[11px] font-mono tracking-[0.2em] uppercase shadow-inner">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
          {isSelected ? 'Volume Pulled from Shelf · Archival Inspection' : 'Reading Table · Active Volume'}
        </div>
      </div>

      {/* Reading table surface */}
      <div className="relative max-w-3xl mx-auto">
        {/* Table surface — dark polished wood */}
        <div
          className="relative rounded-xl p-6 sm:p-10 md:p-12 transition-all duration-500"
          style={{
            background: `
              linear-gradient(135deg, 
                #3D3228 0%, 
                #2E261F 50%, 
                #251E18 100%
              )`,
            boxShadow: isSelected
              ? `0 25px 50px rgba(0,0,0,0.45), 0 10px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4)`
              : `0 20px 40px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3)`,
          }}
        >
          {/* Wood grain */}
          <div
            className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 30px,
                  rgba(255,255,255,0.02) 30px,
                  rgba(255,255,255,0.02) 31px
                )
              `,
            }}
          />

          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-10">
            {/* Book stand / face-out cover */}
            <div className="relative flex flex-col items-center shrink-0">
              <Link
                href={`/books/${book.id}`}
                className="relative block group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Reading stand — brass bookends */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-44 h-2 bg-gradient-to-r from-amber-700/40 via-amber-600/50 to-amber-700/40 rounded-full" />

                {/* Book cover — face out */}
                <motion.div
                  animate={{
                    y: isHovered ? -4 : 0,
                    rotateY: isHovered ? -3 : 0,
                  }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="relative w-44 h-64 rounded-sm overflow-hidden"
                  style={{
                    backgroundColor: coverColor,
                    boxShadow: isHovered
                      ? `8px 12px 24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)`
                      : `4px 6px 16px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)`,
                    transformStyle: 'preserve-3d',
                    perspective: '1000px',
                  }}
                >
                  {/* Cloth texture */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.15' fill-rule='evenodd'%3E%3Cpath d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />

                  {/* Embossed border */}
                  <div className="absolute inset-3 border border-white/[0.06] rounded-sm" />

                  {/* Cover content */}
                  <div className="relative h-full flex flex-col items-center justify-between p-5 text-center">
                    <div className="w-10 h-px bg-white/25" />

                    <div className="flex-1 flex flex-col items-center justify-center">
                      <h2
                        className="font-display text-lg font-bold leading-tight"
                        style={{
                          color: 'rgba(245, 240, 232, 0.95)',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {book.title}
                      </h2>

                      {book.author_name && (
                        <p
                          className="mt-2 text-[11px] tracking-[0.14em] uppercase"
                          style={{ color: 'rgba(245, 240, 232, 0.6)' }}
                        >
                          {book.author_name}
                        </p>
                      )}
                    </div>

                    <div className="w-10 h-px bg-white/25" />
                  </div>

                  {/* Edge highlights */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-b from-white/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
              </Link>
            </div>

            {/* Archival inspection details */}
            <div className="flex-1 flex flex-col justify-between w-full text-paper/90">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-paper leading-snug">
                      {book.title}
                    </h2>
                    {book.author_name && (
                      <p className="text-sm text-paper/70 mt-0.5 tracking-wide">
                        by{' '}
                        {book.author_id ? (
                          <Link
                            href={`/authors/${book.author_id}`}
                            className="text-amber-200 hover:text-amber-100 underline decoration-amber-600/50 hover:decoration-amber-400 transition-colors"
                          >
                            {book.author_name}
                          </Link>
                        ) : (
                          book.author_name
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Archival metadata pills */}
                <div className="flex flex-wrap gap-2 my-4">
                  <span className="px-3 py-1 rounded-md bg-white/10 border border-white/10 text-xs text-paper/90 font-medium">
                    {book.discussion_count} {book.discussion_count === 1 ? 'Discussion' : 'Discussions'}
                  </span>
                  {book.meetups && book.meetups.length > 0 && (
                    <span className="px-3 py-1 rounded-md bg-white/10 border border-white/10 text-xs text-paper/90 font-medium">
                      {book.meetups.length} {book.meetups.length === 1 ? 'Meetup' : 'Meetups'}
                    </span>
                  )}
                  {book.first_discussed_date && (
                    <span className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-paper/70">
                      First discussed {formatDate(book.first_discussed_date)}
                    </span>
                  )}
                </div>

                {/* Real BBB Readers */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-paper/50 mb-2">
                    BBB Readers & Discussants
                  </div>
                  {book.members && book.members.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {book.members.map((member, idx) => (
                        <Link
                          key={`reader-${member.id || idx}-${idx}`}
                          href={`/members/${member.id}`}
                          className="px-2.5 py-0.5 rounded-full bg-amber-900/40 hover:bg-amber-800/60 border border-amber-600/40 hover:border-amber-400 text-amber-200 hover:text-amber-100 text-xs transition-all shadow-sm"
                        >
                          {member.display_name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-paper/50 italic">
                      Discussion participant records preserved in archive logs
                    </p>
                  )}
                </div>

                {/* Real BBB Meetups */}
                {book.meetups && book.meetups.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-paper/50 mb-2">
                      Meetup Appearances
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-2 scrollbar-thin">
                      {book.meetups.map((m, idx) => (
                        <Link
                          key={`meetup-${m.id || idx}-${idx}`}
                          href={`/meetups/${m.number}`}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-white/5 hover:bg-white/10 text-paper/80 hover:text-paper transition-colors group"
                        >
                          <span className="font-semibold text-amber-300/90 group-hover:text-amber-200">
                            Meetup #{m.number}
                          </span>
                          <span className="text-[11px] text-paper/60">
                            {m.date ? formatDate(m.date) : m.venue || 'Bangalore'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-white/10">
                <Link
                  href={`/books/${book.id}`}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-ink-dark font-medium text-xs tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <span>Examine Full Archive Record</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>

                {isSelected && onReturnToShelf && (
                  <button
                    onClick={onReturnToShelf}
                    className="px-4 py-2 rounded-lg border border-white/20 text-paper/70 hover:text-paper hover:bg-white/10 text-xs tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Return to Shelf</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table legs — subtle */}
        <div className="absolute -bottom-3 left-8 w-2 h-3 bg-gradient-to-b from-amber-900/40 to-amber-950/20 rounded-b" />
        <div className="absolute -bottom-3 right-8 w-2 h-3 bg-gradient-to-b from-amber-900/40 to-amber-950/20 rounded-b" />
      </div>
    </motion.div>
  )
}

