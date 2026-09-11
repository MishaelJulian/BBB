'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Library-inspired color palette — Folio Society / Everyman's Library tones
const SPINE_COLORS = [
  { bg: '#2D4A3E', accent: '#1E3A30' }, // Forest Green
  { bg: '#1E3A5F', accent: '#152D4A' }, // Oxford Blue
  { bg: '#6B2D3E', accent: '#5A2433' }, // Burgundy
  { bg: '#5C1A1A', accent: '#4A1414' }, // Oxblood
  { bg: '#4A3728', accent: '#3D2E20' }, // Walnut Brown
  { bg: '#2D2D2D', accent: '#222222' }, // Charcoal
  { bg: '#3D2B4F', accent: '#322242' }, // Deep Plum
  { bg: '#1A3D3D', accent: '#143232' }, // Dark Emerald
  { bg: '#3D5A6E', accent: '#324D5E' }, // Slate Blue
  { bg: '#6B2D2D', accent: '#5A2424' }, // Antique Red
]

// Generate consistent color and aging from book title
function getBookStyle(title: string): {
  colors: typeof SPINE_COLORS[0]
  aging: number
  pageTint: number
} {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colorIndex = Math.abs(hash) % SPINE_COLORS.length
  const aging = (Math.abs(hash) % 10) / 100 // 0-10% variation
  const pageTint = 240 + (Math.abs(hash >> 4) % 8) // Off-white variation

  return {
    colors: SPINE_COLORS[colorIndex],
    aging,
    pageTint,
  }
}

// Estimate spine width based on title length
function getSpineWidth(title: string): number {
  const baseWidth = 26
  const extraChars = Math.max(0, title.length - 18)
  return baseWidth + Math.min(extraChars, 14)
}

// Generate classification code
function getClassificationCode(title: string): string {
  const titleLower = title.toLowerCase()
  let prefix = 'FIC'

  if (titleLower.includes('history') || titleLower.includes('ancient')) prefix = 'HIS'
  else if (titleLower.includes('philosophy') || titleLower.includes('thinking')) prefix = 'PHI'
  else if (titleLower.includes('science') || titleLower.includes('physics')) prefix = 'SCI'
  else if (titleLower.includes('memoir') || titleLower.includes('biography')) prefix = 'BIO'
  else if (titleLower.includes('poem') || titleLower.includes('verse')) prefix = 'POE'
  else if (titleLower.includes('india') || titleLower.includes('bengal')) prefix = 'IND'

  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const num = (Math.abs(hash) % 900) + 100

  return `${prefix}-${num}`
}

interface BookSpineProps {
  id: string
  title: string
  author?: string
  discussionCount?: number
  firstDiscussedYear?: number
  memberCount?: number
  className?: string
}

export function BookSpine({
  id,
  title,
  author,
  discussionCount = 0,
  firstDiscussedYear,
  memberCount = 0,
  className,
}: BookSpineProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const { colors, aging, pageTint } = getBookStyle(title)
  const width = getSpineWidth(title)
  const classification = getClassificationCode(title)

  return (
    <Link
      href={`/books/${id}`}
      className={cn('relative block', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={`${title} by ${author || 'Unknown author'}`}
    >
      <motion.div
        className="relative cursor-pointer"
        animate={{
          y: isHovered ? -10 : 0,
          rotateZ: isHovered ? -1.5 : 0,
        }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ width }}
      >
        {/* Book shadow — softer when hovering */}
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full blur-md"
          animate={{
            width: isHovered ? width * 0.9 : width * 0.7,
            opacity: isHovered ? 0.25 : 0.12,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
          transition={{ duration: 0.25 }}
        />

        {/* Page block — realistic off-white pages */}
        <div
          className="absolute rounded-r-sm"
          style={{
            left: 3,
            right: -3,
            top: 2,
            bottom: 0,
            background: `linear-gradient(90deg, 
              rgb(${pageTint - 5}, ${pageTint - 8}, ${pageTint - 15}) 0%, 
              rgb(${pageTint}, ${pageTint - 3}, ${pageTint - 8}) 30%,
              rgb(${pageTint + 2}, ${pageTint - 1}, ${pageTint - 5}) 70%,
              rgb(${pageTint - 3}, ${pageTint - 6}, ${pageTint - 12}) 100%)`,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          {/* Page lines */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.03) 2px,
                rgba(0,0,0,0.03) 3px
              )`,
            }}
          />
        </div>

        {/* Front cover — cloth-bound texture */}
        <div
          className="relative rounded-sm overflow-hidden"
          style={{
            backgroundColor: colors.bg,
            boxShadow: isHovered
              ? `4px 6px 16px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)`
              : `2px 3px 8px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)`,
          }}
        >
          {/* Linen/cloth texture — woven pattern */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.12 + aging,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.15' fill-rule='evenodd'%3E%3Cpath d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3Cpath d='M0 4h4v4H0V4zm4-4h4v4H4V0z' fill-opacity='0.08'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Subtle grain noise */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Embossed border — inset frame */}
          <div
            className="absolute inset-2 border border-white/[0.06] rounded-sm"
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 1px rgba(0,0,0,0.1)',
            }}
          />

          {/* Spine content */}
          <div className="relative h-full flex flex-col items-center justify-between py-4 px-1.5">
            {/* Top decorative rule */}
            <div className="w-4 h-px bg-white/20" />

            {/* Title (vertical, embossed effect) */}
            <div
              className="flex-1 flex items-center justify-center"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              <span
                className="font-display text-[11px] font-semibold tracking-[0.08em] truncate"
                style={{
                  color: 'rgba(245, 240, 232, 0.92)',
                  textShadow: '0 1px 0 rgba(0,0,0,0.4), 0 -1px 0 rgba(255,255,255,0.08)',
                  maxWidth: '85%',
                }}
              >
                {title}
              </span>
            </div>

            {/* Author (vertical, smaller) */}
            {author && (
              <div
                className="mt-3"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                <span
                  className="text-[8px] tracking-[0.1em] truncate"
                  style={{ color: 'rgba(245, 240, 232, 0.55)' }}
                >
                  {author.split(' ').pop()}
                </span>
              </div>
            )}

            {/* Classification label — library call number */}
            <div className="mt-3 pt-2 border-t border-white/10">
              <span
                className="text-[7px] font-mono tracking-[0.15em]"
                style={{ color: 'rgba(245, 240, 232, 0.4)' }}
              >
                {classification}
              </span>
            </div>
          </div>

          {/* Top edge highlight — bevel */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)',
            }}
          />

          {/* Bottom edge shadow */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(0deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 100%)',
            }}
          />

          {/* Left edge — spine fold */}
          <div
            className="absolute top-0 bottom-0 left-0 w-[3px]"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
            }}
          />

          {/* Specular highlight — very subtle */}
          <div
            className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
            }}
          />
        </div>

        {/* Hover tooltip */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-10 pointer-events-none"
          >
            <div className="bg-ink text-paper px-4 py-3 rounded-lg shadow-xl text-xs whitespace-nowrap">
              <div className="font-semibold text-sm">{title}</div>
              {author && <div className="opacity-70 mt-0.5">{author}</div>}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-3 opacity-60 text-[11px]">
                <span>{discussionCount} discussions</span>
                {firstDiscussedYear && <span>· {firstDiscussedYear}</span>}
                {memberCount > 0 && <span>· {memberCount} readers</span>}
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-ink" />
          </motion.div>
        )}
      </motion.div>
    </Link>
  )
}
