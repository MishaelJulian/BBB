'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Book3D } from './Book3D'

export interface ShelfBook {
  id: string
  title: string
  author?: string
  author_name?: string | null
  discussionCount?: number
  discussion_count?: number
  firstDiscussedYear?: number
  first_discussed_date?: string | null
  memberCount?: number
}

export interface ShelfBayProps {
  bayId?: string
  title?: string
  subtitle?: string
  shelfNumber?: number | string
  books: ShelfBook[]
  selectedBookId?: string | null
  highlightedBookId?: string | null
  searchQuery?: string
  onSelectBook?: (bookId: string) => void
  onHoverBook?: (isHovered: boolean, meta: { id: string; title: string; author?: string; catalogNo: string; discussionCount: number } | null) => void
  className?: string
}

export function ShelfBay({
  bayId,
  title,
  subtitle,
  shelfNumber,
  books,
  selectedBookId,
  highlightedBookId,
  searchQuery = '',
  onSelectBook,
  onHoverBook,
  className,
}: ShelfBayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const [isInViewport, setIsInViewport] = React.useState(false)

  // Virtualization: Keep active if in viewport or holds selected/highlighted book
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if ((selectedBookId && books.some((b) => b.id === selectedBookId)) ||
        (highlightedBookId && books.some((b) => b.id === highlightedBookId))) {
      setIsInViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting)
      },
      { rootMargin: '800px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [books, selectedBookId, highlightedBookId])

  const checkScroll = React.useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 15)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15)
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
  }, [checkScroll, isInViewport])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -520 : 520,
      behavior: 'smooth',
    })
  }

  const selectedIndex = React.useMemo(() => {
    if (!selectedBookId) return null
    const idx = books.findIndex((b) => b.id === selectedBookId)
    return idx >= 0 ? idx : null
  }, [books, selectedBookId])

  const highlightedIndex = React.useMemo(() => {
    if (!highlightedBookId) return null
    const idx = books.findIndex((b) => b.id === highlightedBookId)
    return idx >= 0 ? idx : null
  }, [books, highlightedBookId])

  // Center selected / highlighted book on the shelf
  React.useEffect(() => {
    const targetIdx = selectedIndex ?? highlightedIndex
    if (targetIdx !== null && scrollRef.current) {
      const targetScrollLeft = Math.max(0, targetIdx * 42 - 240)
      scrollRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      })
    }
  }, [selectedIndex, highlightedIndex])

  const queryClean = searchQuery.trim().toLowerCase()

  return (
    <div
      ref={containerRef}
      id={bayId}
      className={cn('relative w-full my-6 scroll-mt-24', className)}
    >
      {/* Archival Bay Title & Shelf Plaque */}
      {title && (
        <div className="mb-2 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {shelfNumber && (
              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
                BAY {shelfNumber}
              </span>
            )}
            <h3 className="font-display text-sm sm:text-base font-bold text-[#FAF6EE] tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span>{title}</span>
            </h3>
            {subtitle && (
              <span className="hidden md:inline text-xs text-amber-200/50 italic font-serif">
                — {subtitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/40 font-mono tracking-wider">
              {books.length} {books.length === 1 ? 'Volume' : 'Volumes'}
            </span>
          </div>
        </div>
      )}

      {/* Architectural Solid Walnut Bookcase Tier */}
      <div className="relative group rounded-xl bg-gradient-to-b from-[#1C1612] via-[#140F0C] to-[#0D0A08] border border-amber-950/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Overhead Brass Picture Light / Downward Lamp Falloff */}
        <div
          className="absolute top-0 inset-x-0 h-24 pointer-events-none z-10"
          style={{
            background: `
              radial-gradient(ellipse 60% 80% at 50% 0%, rgba(250, 220, 160, 0.12) 0%, transparent 85%),
              linear-gradient(180deg, rgba(255, 235, 180, 0.04) 0%, transparent 100%)
            `,
          }}
        />

        {/* Left Wood Pillar with Brass Trim */}
        <div className="absolute top-0 bottom-0 left-0 w-3 sm:w-4 z-20 pointer-events-none bg-gradient-to-r from-[#2C1D14] via-[#1E130D] to-transparent border-r border-amber-900/30">
          <div className="absolute top-4 left-0.5 bottom-4 w-1 border-r border-amber-500/20" />
        </div>

        {/* Right Wood Pillar with Brass Trim */}
        <div className="absolute top-0 bottom-0 right-0 w-3 sm:w-4 z-20 pointer-events-none bg-gradient-to-l from-[#2C1D14] via-[#1E130D] to-transparent border-l border-amber-900/30">
          <div className="absolute top-4 right-0.5 bottom-4 w-1 border-l border-amber-500/20" />
        </div>

        {/* Scroll Left Navigation Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-20 bg-[#16110D]/95 border border-amber-600/40 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:bg-[#281D15] text-amber-300 hover:scale-105 active:scale-95 backdrop-blur-md"
            aria-label="Scroll bay left"
            suppressHydrationWarning
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Scroll Right Navigation Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-20 bg-[#16110D]/95 border border-amber-600/40 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:bg-[#281D15] text-amber-300 hover:scale-105 active:scale-95 backdrop-blur-md"
            aria-label="Scroll bay right"
            suppressHydrationWarning
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
            </svg>
          </button>
        )}

        {/* The Bookshelf Stage: Books Row */}
        <div
          ref={scrollRef}
          className="flex items-end overflow-x-auto pt-10 pb-2 px-8 min-h-[245px] scrollbar-none"
          style={{
            scrollSnapType: 'x proximity',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {isInViewport ? (
            books.map((book, index) => {
              const isHoverNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1
              const isSelectedNeighbor = selectedIndex !== null && Math.abs(selectedIndex - index) === 1
              const isSelected = selectedBookId === book.id
              const isHighlighted = highlightedBookId === book.id

              const isMatch = !queryClean || (
                book.title.toLowerCase().includes(queryClean) ||
                (book.author || book.author_name || '').toLowerCase().includes(queryClean)
              )

              const displacement = isSelectedNeighbor
                ? selectedIndex! < index ? 10 : -10
                : isHoverNeighbor
                ? hoveredIndex! < index ? 6 : -6
                : 0

              return (
                <motion.div
                  key={`${book.id}-${index}`}
                  style={{ scrollSnapAlign: 'start' }}
                  animate={{ x: displacement }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="shrink-0 mx-0.5"
                >
                  <Book3D
                    id={book.id}
                    title={book.title}
                    author={book.author || book.author_name || undefined}
                    discussionCount={book.discussionCount ?? book.discussion_count ?? 0}
                    firstDiscussedYear={
                      book.firstDiscussedYear ??
                      (book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : undefined)
                    }
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isDimmed={!isMatch}
                    onSelect={onSelectBook}
                    onHoverStateChange={(hovered, meta) => {
                      if (onHoverBook) {
                        onHoverBook(hovered, hovered ? meta : null)
                      }
                    }}
                  />
                </motion.div>
              )
            })
          ) : (
            // Lightweight placeholder volume silhouettes when shelf is off-screen
            books.slice(0, 24).map((book, idx) => (
              <div
                key={`ph-${book.id}-${idx}`}
                className="w-8 h-44 mx-1 rounded-t-sm bg-[#1A1410] border-t border-amber-900/30 opacity-40 shrink-0"
              />
            ))
          )}
        </div>

        {/* Solid Walnut Wood Shelf Board with Beveled Brass Front Rail */}
        <div className="relative h-7 -mt-1 mx-2 z-20">
          {/* Wood board */}
          <div
            className="absolute inset-x-0 h-full rounded-b-md overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #5C412B 0%, #463120 30%, #352416 70%, #20150C 100%)',
              boxShadow: `
                0 10px 24px rgba(0,0,0,0.8),
                inset 0 1px 0 rgba(255,255,255,0.18),
                inset 0 -1px 0 rgba(0,0,0,0.8)
              `,
            }}
          >
            {/* Fine wood grain */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(255,255,255,0.03) 24px, rgba(255,255,255,0.03) 25px),
                  repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,0,0,0.08) 60px, rgba(0,0,0,0.08) 62px)
                `,
              }}
            />
          </div>

          {/* Gilded Brass Front Edge */}
          <div
            className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-b-sm"
            style={{
              background: 'linear-gradient(90deg, #7C5A2C 0%, #D4A757 50%, #7C5A2C 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          />

          {/* Brass mounting bracket accents */}
          <div className="absolute -bottom-3 left-12 w-4 h-3 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 rounded-b-sm border-t border-amber-400/50 shadow-lg" />
          <div className="absolute -bottom-3 right-12 w-4 h-3 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 rounded-b-sm border-t border-amber-400/50 shadow-lg" />
        </div>
      </div>
    </div>
  )
}
