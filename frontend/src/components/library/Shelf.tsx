'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BookSpine } from './BookSpine'

interface ShelfBook {
  id: string
  title: string
  author?: string
  discussionCount?: number
  firstDiscussedYear?: number
  memberCount?: number
}

interface ShelfProps {
  title?: string
  books: ShelfBook[]
  className?: string
}

export function Shelf({ title, books, className }: ShelfProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  const checkScroll = React.useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -350 : 350,
      behavior: 'smooth',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn('relative', className)}
    >
      {/* Shelf title */}
      {title && (
        <div className="mb-4 flex items-center gap-4">
          <h3 className="font-display text-lg font-semibold text-ink tracking-wide">{title}</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          <span className="text-xs text-muted font-mono tracking-wider">{books.length} volumes</span>
        </div>
      )}

      {/* Books container with ambient lighting */}
      <div className="relative group">
        {/* Warm ambient light — top */}
        <div
          className="absolute -top-8 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center top, rgba(255, 248, 230, 0.08) 0%, transparent 70%)',
          }}
        />

        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-paper/95 border border-border/50 rounded-r-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center hover:bg-paper-dark backdrop-blur-sm"
            aria-label="Scroll left"
          >
            <svg className="h-5 w-5 text-ink/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-paper/95 border border-border/50 rounded-l-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center hover:bg-paper-dark backdrop-blur-sm"
            aria-label="Scroll right"
          >
            <svg className="h-5 w-5 text-ink/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Scrollable books */}
        <div
          ref={scrollRef}
          className="flex items-end gap-[2px] overflow-x-auto pb-6 pt-10 px-4"
          style={{
            scrollSnapType: 'x proximity',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.shelf-scroll::-webkit-scrollbar { display: none; }`}</style>
          {books.map((book, index) => (
            <motion.div
              key={book.id}
              style={{ scrollSnapAlign: 'start' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.4 }}
            >
              <BookSpine
                id={book.id}
                title={book.title}
                author={book.author}
                discussionCount={book.discussionCount}
                firstDiscussedYear={book.firstDiscussedYear}
                memberCount={book.memberCount}
              />
            </motion.div>
          ))}
        </div>

        {/* Shelf board — walnut wood construction */}
        <div className="relative h-5 -mt-2">
          {/* Main shelf board */}
          <div
            className="absolute inset-x-0 h-full rounded-b-sm overflow-hidden"
            style={{
              background: `
                linear-gradient(180deg, 
                  #7D6548 0%, 
                  #6B5540 20%, 
                  #5E4A38 50%, 
                  #523F30 80%, 
                  #4A3828 100%
                )`,
              boxShadow: `
                0 6px 12px rgba(0,0,0,0.25),
                0 2px 4px rgba(0,0,0,0.15),
                inset 0 1px 0 rgba(255,255,255,0.12),
                inset 0 -1px 0 rgba(0,0,0,0.2)
              `,
            }}
          >
            {/* Walnut wood grain — horizontal */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 20px,
                    rgba(0,0,0,0.04) 20px,
                    rgba(0,0,0,0.04) 21px
                  ),
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 47px,
                    rgba(0,0,0,0.03) 47px,
                    rgba(0,0,0,0.03) 48px
                  )
                `,
              }}
            />

            {/* Wood grain swirls — subtle curves */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='20' viewBox='0 0 120 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q30 5 60 10 T120 10' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* Front edge — beveled */}
          <div
            className="absolute inset-x-0 bottom-0 h-[3px]"
            style={{
              background: 'linear-gradient(180deg, #4A3828 0%, #3D2E1F 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />

          {/* Top edge highlight */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 100%)',
            }}
          />
        </div>

        {/* Shelf brackets — brass/bronze */}
        <div className="absolute -bottom-6 left-12">
          <div className="w-3 h-6 bg-gradient-to-b from-amber-700/60 to-amber-900/40 rounded-b-sm" />
          <div className="w-5 h-1 bg-amber-800/40 rounded-b-sm -ml-1" />
        </div>
        <div className="absolute -bottom-6 right-12">
          <div className="w-3 h-6 bg-gradient-to-b from-amber-700/60 to-amber-900/40 rounded-b-sm" />
          <div className="w-5 h-1 bg-amber-800/40 rounded-b-sm -ml-1" />
        </div>

        {/* Shadow beneath shelf */}
        <div
          className="absolute -bottom-8 inset-x-8 h-4 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.08) 0%, transparent 70%)',
          }}
        />
      </div>
    </motion.div>
  )
}
