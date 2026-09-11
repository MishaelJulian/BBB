'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// Library-inspired color palette
const COVER_COLORS = [
  '#2D4A3E', // Forest Green
  '#1E3A5F', // Oxford Blue
  '#6B2D3E', // Burgundy
  '#5C1A1A', // Oxblood
  '#4A3728', // Walnut Brown
  '#2D2D2D', // Charcoal
  '#3D2B4F', // Deep Plum
  '#1A3D3D', // Dark Emerald
  '#3D5A6E', // Slate Blue
  '#6B2D2D', // Antique Red
]

// Generate consistent color from book title
function getCoverColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length]
}

interface BookCoverProps {
  title: string
  author?: string
  firstDiscussedMeetup?: number
  firstDiscussedYear?: number
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

export function BookCover({
  title,
  author,
  firstDiscussedMeetup,
  firstDiscussedYear,
  isOpen = false,
  onClose,
  className,
}: BookCoverProps) {
  const color = getCoverColor(title)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Book cover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none',
              className
            )}
          >
            <div className="relative pointer-events-auto">
              {/* Book shadow */}
              <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/20 blur-xl rounded-full" />

              {/* Front cover */}
              <div
                className="relative w-80 h-[480px] rounded-sm overflow-hidden"
                style={{
                  backgroundColor: color,
                  boxShadow: '8px 8px 24px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              >
                {/* Cloth texture overlay */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000000' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Cover content */}
                <div className="relative h-full flex flex-col items-center justify-between p-8 text-center">
                  {/* Top decorative line */}
                  <div className="w-16 h-px bg-white/30" />

                  {/* Title */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <h2
                      className="font-display text-3xl font-bold tracking-tight leading-tight"
                      style={{ color: '#f5f0e8' }}
                    >
                      {title}
                    </h2>

                    {author && (
                      <p
                        className="mt-4 text-sm tracking-widest uppercase"
                        style={{ color: '#f5f0e8', opacity: 0.7 }}
                      >
                        {author}
                      </p>
                    )}
                  </div>

                  {/* First discussed info */}
                  <div className="space-y-2">
                    <div className="w-16 h-px bg-white/30" />
                    <p
                      className="text-xs tracking-wider"
                      style={{ color: '#f5f0e8', opacity: 0.6 }}
                    >
                      First discussed
                    </p>
                    {firstDiscussedMeetup && (
                      <p
                        className="font-display text-sm font-semibold"
                        style={{ color: '#f5f0e8', opacity: 0.8 }}
                      >
                        BBB Meetup #{firstDiscussedMeetup}
                      </p>
                    )}
                    {firstDiscussedYear && !firstDiscussedMeetup && (
                      <p
                        className="font-display text-sm font-semibold"
                        style={{ color: '#f5f0e8', opacity: 0.8 }}
                      >
                        {firstDiscussedYear}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edge highlights */}
                <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-black/20" />
                <div className="absolute top-0 bottom-0 left-0 w-px bg-white/5" />
                <div className="absolute top-0 bottom-0 right-0 w-px bg-black/10" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-paper border border-border shadow-md flex items-center justify-center text-ink hover:bg-paper-dark transition-colors"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
