'use client'

import * as React from 'react'
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion'
import Link from 'next/link'
import type { Book } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { getBookPalette, getCatalogNumber } from './Book3D'

interface HeroBookModalProps {
  book: Book | null
  shelfBooks?: Book[]
  isOpen: boolean
  isSavedInBag?: boolean
  onToggleBag?: (book: Book) => void
  onClose: () => void
  onSelectBook?: (bookId: string) => void
}

export function HeroBookModal({
  book,
  shelfBooks = [],
  isOpen,
  isSavedInBag = false,
  onToggleBag,
  onClose,
  onSelectBook,
}: HeroBookModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Spring-smoothed 3D mouse tracking
  const springConfig = { stiffness: 120, damping: 20, mass: 0.8 }
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // Base 3D rotation angles derived from mouse position
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-24, 24])
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [14, -14])
  const shadowX = useTransform(smoothX, [-0.5, 0.5], [-35, 35])
  const shadowBlur = useTransform(smoothY, [-0.5, 0.5], [40, 60])

  // Track active angle mode (dynamic = interactive mouse 3/4 front, spine = spine inspection, front = flat front, back = back cover)
  const [viewAngle, setViewAngle] = React.useState<'dynamic' | 'spine' | 'front' | 'back'>('dynamic')

  // Reset springs when book changes
  React.useEffect(() => {
    mouseX.set(0)
    mouseY.set(0)
    setViewAngle('dynamic')
  }, [book?.id, mouseX, mouseY])

  // Keyboard navigation & ESC handler
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && shelfBooks.length > 0 && book) {
        const currIdx = shelfBooks.findIndex((b) => b.id === book.id)
        if (currIdx >= 0 && currIdx < shelfBooks.length - 1 && onSelectBook) {
          onSelectBook(shelfBooks[currIdx + 1].id)
        }
      } else if (e.key === 'ArrowLeft' && shelfBooks.length > 0 && book) {
        const currIdx = shelfBooks.findIndex((b) => b.id === book.id)
        if (currIdx > 0 && onSelectBook) {
          onSelectBook(shelfBooks[currIdx - 1].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, book, shelfBooks, onClose, onSelectBook])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewAngle !== 'dynamic') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  // Prev / Next book navigation in current shelf/bay
  const currentIdx = book && shelfBooks.length > 0 ? shelfBooks.findIndex((b) => b.id === book.id) : -1
  const prevBook = currentIdx > 0 ? shelfBooks[currentIdx - 1] : null
  const nextBook = currentIdx >= 0 && currentIdx < shelfBooks.length - 1 ? shelfBooks[currentIdx + 1] : null

  if (!book) return null

  const palette = getBookPalette(book.title)
  const catalogNo = getCatalogNumber(book.title, book.id)
  const bookDepth = 36
  const bookWidth = 260
  const bookHeight = 390

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Depth-of-field background isolation & dark warm vignette */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-[#090705]/85 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Warm cinematic spotlight from above */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 70% 60% at 50% 35%, rgba(245, 225, 180, 0.14) 0%, transparent 75%),
                radial-gradient(circle at 50% 50%, transparent 40%, rgba(9, 7, 5, 0.7) 100%)
              `,
            }}
          />

          {/* Previous Volume Arrow */}
          {prevBook && onSelectBook && (
            <button
              onClick={() => onSelectBook(prevBook.id)}
              suppressHydrationWarning
              className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-40 p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-amber-950/80 border border-amber-500/30 text-amber-200 hover:text-white backdrop-blur-xl transition-all shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:scale-110 active:scale-95 group hidden md:flex items-center gap-2"
              title={`Previous: ${prevBook.title}`}
              aria-label="Previous volume in collection"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs font-serif max-w-[120px] truncate opacity-0 group-hover:opacity-100 transition-opacity hidden lg:inline text-amber-100">
                {prevBook.title}
              </span>
            </button>
          )}

          {/* Next Volume Arrow */}
          {nextBook && onSelectBook && (
            <button
              onClick={() => onSelectBook(nextBook.id)}
              suppressHydrationWarning
              className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-40 p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-amber-950/80 border border-amber-500/30 text-amber-200 hover:text-white backdrop-blur-xl transition-all shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:scale-110 active:scale-95 group hidden md:flex items-center gap-2"
              title={`Next: ${nextBook.title}`}
              aria-label="Next volume in collection"
            >
              <span className="text-xs font-serif max-w-[120px] truncate opacity-0 group-hover:opacity-100 transition-opacity hidden lg:inline text-amber-100">
                {nextBook.title}
              </span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Main Inspection Stage: Left Dossier | Center 3D Hero Book | Right Actions */}
          <div className="relative z-30 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 py-6 pointer-events-auto">

            {/* LEFT PANEL: Archival Record Dossier */}
            <motion.div
              initial={{ opacity: 0, x: -35 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="w-full lg:w-80 bg-[#14100D]/90 border border-amber-900/40 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-paper flex flex-col justify-between order-2 lg:order-1 max-h-[520px] overflow-y-auto scrollbar-thin"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-amber-400 uppercase mb-3">
                  <span>Archival Record</span>
                  <span>{catalogNo}</span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug mb-1">
                  {book.title}
                </h3>

                {book.author_name && (
                  <p className="text-xs text-amber-200/90 mb-4 tracking-wide font-sans">
                    by{' '}
                    {book.author_id ? (
                      <Link
                        href={`/authors/${book.author_id}`}
                        className="underline decoration-amber-400/50 hover:decoration-amber-400 hover:text-white transition-colors"
                      >
                        {book.author_name}
                      </Link>
                    ) : (
                      book.author_name
                    )}
                  </p>
                )}

                {/* Archival Metrics */}
                <div className="grid grid-cols-2 gap-2 my-4 py-3 border-y border-white/10 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase font-mono text-white/50 tracking-wider">
                      Discussions
                    </span>
                    <span className="font-display font-semibold text-paper text-sm text-amber-300">
                      {book.discussion_count} {book.discussion_count === 1 ? 'Meetup' : 'Meetups'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-mono text-white/50 tracking-wider">
                      First Discussed
                    </span>
                    <span className="font-display font-semibold text-paper text-sm">
                      {book.first_discussed_date ? formatDate(book.first_discussed_date) : 'BBB Archive'}
                    </span>
                  </div>
                </div>

                {/* Readers & Discussants */}
                <div className="mt-4">
                  <span className="block text-[10px] uppercase font-mono text-white/50 tracking-wider mb-2">
                    BBB Readers & Presenters
                  </span>
                  {book.members && book.members.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                      {book.members.map((member, idx) => (
                        <Link
                          key={`member-${member.id || idx}-${idx}`}
                          href={`/members/${member.id}`}
                          className="px-2.5 py-1 rounded-md bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 hover:border-amber-400/70 text-[11px] text-amber-200/95 hover:text-white transition-colors"
                        >
                          {member.display_name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">
                      Preserved in community archives since 2017.
                    </p>
                  )}
                </div>
              </div>

              {/* Dossier Footer */}
              <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/50 flex items-center justify-between">
                <span>Spine Cat. {catalogNo}</span>
                <span className="text-[10px] font-mono text-amber-400/80">Bangalore</span>
              </div>
            </motion.div>

            {/* CENTER: 3D Physical Hardcover Hero Volume */}
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 40, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="relative flex flex-col items-center justify-center order-1 lg:order-2 my-4 lg:my-0 select-none"
              style={{ perspective: '1400px' }}
            >
              {/* Dynamic Soft Contact Shadow */}
              <motion.div
                className="absolute -bottom-10 rounded-full bg-black/80 blur-2xl pointer-events-none"
                style={{
                  width: bookWidth * 1.3,
                  height: 44,
                  x: shadowX,
                  filter: `blur(${shadowBlur}px)`,
                }}
              />

              {/* 3D Physical Hardcover Volume */}
              <motion.div
                className="relative cursor-grab active:cursor-grabbing transition-transform"
                style={{
                  width: bookWidth,
                  height: bookHeight,
                  transformStyle: 'preserve-3d',
                  rotateY:
                    viewAngle === 'spine'
                      ? -65
                      : viewAngle === 'front'
                      ? 0
                      : viewAngle === 'back'
                      ? 180
                      : rotateY,
                  rotateX: viewAngle === 'front' || viewAngle === 'spine' || viewAngle === 'back' ? 0 : rotateX,
                  transformOrigin: 'center center',
                }}
              >
                {/* FRONT COVER */}
                <div
                  className="absolute inset-0 rounded-sm overflow-hidden"
                  style={{
                    backgroundColor: palette.bg,
                    transform: `translateZ(${bookDepth / 2}px)`,
                    backfaceVisibility: 'hidden',
                    boxShadow: `
                      inset 0 0 0 1px rgba(255,255,255,0.14),
                      inset 0 0 24px rgba(0,0,0,0.45),
                      0 25px 50px rgba(0,0,0,0.7)
                    `,
                  }}
                >
                  {/* Cloth / Leather Texture */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.25' fill-rule='evenodd'%3E%3Cpath d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />

                  {/* Gold Foil Embossed Filigree Border */}
                  <div
                    className="absolute inset-3.5 border rounded-sm pointer-events-none"
                    style={{
                      borderColor: `${palette.foil}45`,
                      boxShadow: `inset 0 0 1px 1px ${palette.foil}30, 0 0 1px ${palette.foil}35`,
                    }}
                  />
                  <div
                    className="absolute inset-5 border rounded-sm pointer-events-none"
                    style={{
                      borderColor: `${palette.foil}25`,
                    }}
                  />

                  {/* Corner brass ornaments */}
                  <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: palette.foil }} />
                  <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: palette.foil }} />
                  <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: palette.foil }} />
                  <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: palette.foil }} />

                  {/* Front Cover Typography */}
                  <div className="relative h-full flex flex-col items-center justify-between p-7 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-px mb-2" style={{ backgroundColor: `${palette.foil}70` }} />
                      <span
                        className="text-[9px] uppercase font-mono tracking-[0.25em]"
                        style={{ color: `${palette.foil}EE` }}
                      >
                        Broke Bibliophiles
                      </span>
                    </div>

                    <div className="my-auto py-4">
                      <h2
                        className="font-display text-2xl sm:text-3xl font-bold leading-tight px-2"
                        style={{
                          color: '#FAF7F0',
                          textShadow: '0 2px 5px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.25)',
                        }}
                      >
                        {book.title}
                      </h2>

                      {book.author_name && (
                        <p
                          className="mt-3 text-xs sm:text-sm font-serif tracking-widest uppercase font-medium"
                          style={{
                            color: palette.foil,
                            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          }}
                        >
                          {book.author_name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                      <div
                        className="px-3 py-0.5 rounded-full border text-[10px] font-mono tracking-widest"
                        style={{
                          borderColor: `${palette.foil}60`,
                          color: `${palette.foil}EE`,
                          backgroundColor: 'rgba(0,0,0,0.3)',
                        }}
                      >
                        {catalogNo} · BANGALORE
                      </div>
                      <div className="w-8 h-px mt-2" style={{ backgroundColor: `${palette.foil}70` }} />
                    </div>
                  </div>

                  {/* Specular sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(125deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 30%, transparent 60%)',
                    }}
                  />
                  {/* Spine fold shadow */}
                  <div
                    className="absolute top-0 bottom-0 left-0 w-4 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, transparent 100%)',
                    }}
                  />
                </div>

                {/* BACK COVER */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    backgroundColor: palette.accent,
                    transform: `translateZ(-${bookDepth / 2}px) rotateY(180deg)`,
                    backfaceVisibility: 'hidden',
                    boxShadow: 'inset 0 0 24px rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-40">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-400/60 flex items-center justify-center mb-3">
                      <span className="font-serif font-bold text-xs tracking-widest text-amber-200">BBB</span>
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
                      Broke Bibliophiles Archive
                    </span>
                  </div>
                </div>

                {/* SPINE (Left Edge) */}
                <div
                  className="absolute rounded-l-sm overflow-hidden"
                  style={{
                    width: bookDepth,
                    height: bookHeight,
                    left: 0,
                    top: 0,
                    backgroundColor: palette.accent,
                    transform: `rotateY(-90deg) translateZ(${bookDepth / 2}px)`,
                    transformOrigin: 'left center',
                    backfaceVisibility: 'hidden',
                    boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="absolute top-2 inset-x-0 h-1.5 bg-amber-600/50 border-y border-white/25" />
                  <div className="absolute bottom-2 inset-x-0 h-1.5 bg-amber-600/50 border-y border-white/25" />

                  <div
                    className="absolute inset-0 flex flex-col items-center justify-between py-6 px-1"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    <span
                      className="text-[11px] font-display font-semibold tracking-wider truncate"
                      style={{ color: '#FAF7F0', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                    >
                      {book.title}
                    </span>
                    <span
                      className="text-[9px] font-mono tracking-widest opacity-90"
                      style={{ color: palette.foil }}
                    >
                      {catalogNo}
                    </span>
                  </div>

                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, transparent 40%, rgba(255,255,255,0.15) 60%, rgba(0,0,0,0.25) 100%)',
                    }}
                  />
                </div>

                {/* PAGES (Right Edge) */}
                <div
                  className="absolute rounded-r-sm"
                  style={{
                    width: bookDepth,
                    height: bookHeight - 6,
                    right: 0,
                    top: 3,
                    background: `linear-gradient(90deg, ${palette.page} 0%, #E8E0D4 50%, #D8CFC2 100%)`,
                    transform: `rotateY(90deg) translateZ(${bookWidth - bookDepth / 2}px)`,
                    transformOrigin: 'right center',
                    backfaceVisibility: 'hidden',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)',
                    }}
                  />
                </div>

                {/* TOP PAGE EDGE */}
                <div
                  className="absolute"
                  style={{
                    width: bookWidth,
                    height: bookDepth,
                    left: 0,
                    top: 0,
                    background: `linear-gradient(180deg, ${palette.page} 0%, #DFD6C8 100%)`,
                    transform: 'rotateX(90deg) translateZ(0px)',
                    transformOrigin: 'top center',
                    backfaceVisibility: 'hidden',
                  }}
                />

                {/* BOTTOM COVER BASE */}
                <div
                  className="absolute"
                  style={{
                    width: bookWidth,
                    height: bookDepth,
                    left: 0,
                    bottom: 0,
                    backgroundColor: palette.accent,
                    transform: 'rotateX(-90deg) translateZ(0px)',
                    transformOrigin: 'bottom center',
                    backfaceVisibility: 'hidden',
                  }}
                />
              </motion.div>

              {/* View angle toggles (Front / Spine / 3D Turn / Back) */}
              <div className="flex items-center gap-1.5 mt-8 bg-black/60 border border-amber-500/30 rounded-full px-3 py-1 backdrop-blur-xl shadow-lg">
                <button
                  onClick={() => setViewAngle('dynamic')}
                  suppressHydrationWarning
                  className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all ${
                    viewAngle === 'dynamic' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                >
                  3D Interactive
                </button>
                <button
                  onClick={() => setViewAngle('front')}
                  suppressHydrationWarning
                  className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all ${
                    viewAngle === 'front' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setViewAngle('spine')}
                  suppressHydrationWarning
                  className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all ${
                    viewAngle === 'spine' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Spine
                </button>
                <button
                  onClick={() => setViewAngle('back')}
                  suppressHydrationWarning
                  className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all ${
                    viewAngle === 'back' ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Back
                </button>
              </div>

              <p className="text-[11px] text-amber-200/50 mt-2 font-mono tracking-wider">
                Move cursor to turn · Click anywhere to return
              </p>
            </motion.div>

            {/* RIGHT PANEL: Actions & Meetup Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 35 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="w-full lg:w-80 bg-[#14100D]/90 border border-amber-900/40 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-paper flex flex-col justify-between order-3 max-h-[520px] overflow-y-auto scrollbar-thin"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-amber-400 uppercase mb-3">
                  <span>Archival Actions</span>
                  {onToggleBag && (
                    <button
                      onClick={() => onToggleBag(book)}
                      className="flex items-center gap-1 text-xs text-amber-300 hover:text-white transition-colors"
                      title={isSavedInBag ? 'Remove from bag' : 'Add to library bag'}
                    >
                      <span>{isSavedInBag ? '❤️ In Bag' : '🤍 Save'}</span>
                    </button>
                  )}
                </div>

                {/* Primary CTA: Examine Full Record */}
                <Link
                  href={`/books/${book.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-semibold text-xs tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 group mb-3"
                >
                  <span>Examine Full Record</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Return to Shelf Button */}
                <button
                  onClick={onClose}
                  suppressHydrationWarning
                  className="w-full py-2.5 px-4 rounded-xl border border-amber-500/30 hover:border-amber-400/60 bg-white/5 hover:bg-amber-950/40 text-amber-100 hover:text-white font-serif text-xs tracking-wider transition-all flex items-center justify-center gap-2 mb-6 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span>Return Volume to Shelf</span>
                </button>

                {/* Meetup Timeline */}
                <div>
                  <span className="block text-[10px] uppercase font-mono text-white/50 tracking-wider mb-2">
                    BBB Gatherings Mentioned ({book.meetups?.length || 0})
                  </span>
                  {book.meetups && book.meetups.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                      {book.meetups.map((m, idx) => (
                        <Link
                          key={`meetup-${m.id || idx}-${idx}`}
                          href={`/meetups/${m.number}`}
                          className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5 hover:bg-amber-950/60 border border-white/5 hover:border-amber-500/40 text-paper/90 hover:text-white transition-colors group"
                        >
                          <span className="font-semibold text-amber-300 group-hover:text-amber-200">
                            Meetup #{m.number}
                          </span>
                          <span className="text-[11px] text-white/50 group-hover:text-white/80">
                            {m.date ? formatDate(m.date) : m.venue || 'Bangalore'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">
                      No individual meetup records logged for this volume.
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={onClose}
                  suppressHydrationWarning
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors font-mono"
                >
                  <span>ESC / Return</span>
                </button>
              </div>
            </motion.div>

          </div>

          {/* Bottom Title Bar Badge (Criterion Closet Style) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="fixed bottom-6 inset-x-0 mx-auto w-fit z-30 pointer-events-auto"
          >
            <div className="bg-black/85 border border-amber-500/40 rounded-full px-5 py-2 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center gap-4 text-xs">
              <span className="font-mono text-amber-400 font-bold">{catalogNo}</span>
              <span className="h-3 w-px bg-white/20" />
              <span className="font-serif font-medium text-white max-w-[200px] sm:max-w-[320px] truncate">
                {book.title}
              </span>
              {book.author_name && (
                <>
                  <span className="h-3 w-px bg-white/20 hidden sm:inline" />
                  <span className="text-amber-200/70 hidden sm:inline truncate max-w-[160px]">
                    {book.author_name}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
