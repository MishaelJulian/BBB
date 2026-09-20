'use client'

import * as React from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { fetchBooks, type Book } from '@/lib/api'
import { formatDate } from '@/lib/utils'

// ============================================
// 1. Archival Folio Palettes & Spine Styles
// ============================================

export const CLOSET_PALETTES = [
  { name: 'Oxblood Leather', bg: '#361414', accent: '#220B0B', foil: '#E8D298', spineText: '#FAF5EA', rib: '#2A0E0E' },
  { name: 'Forest Morocco', bg: '#172E1E', accent: '#0E1D13', foil: '#DFC57B', spineText: '#FAF5EA', rib: '#122417' },
  { name: 'Oxford Navy', bg: '#162338', accent: '#0D1624', foil: '#E0C788', spineText: '#FAF5EA', rib: '#101B2B' },
  { name: 'Walnut Buckram', bg: '#382516', accent: '#24170D', foil: '#DAC076', spineText: '#FAF5EA', rib: '#2C1D11' },
  { name: 'Burgundy Cloth', bg: '#451722', accent: '#2D0D15', foil: '#EAD7A1', spineText: '#FAF5EA', rib: '#36111A' },
  { name: 'Obsidian Black', bg: '#1E1E22', accent: '#121215', foil: '#E5E2D9', spineText: '#FAF5EA', rib: '#161619' },
  { name: 'Imperial Plum', bg: '#2D173B', accent: '#1C0D26', foil: '#E6C98F', spineText: '#FAF5EA', rib: '#23112E' },
  { name: 'Dark Spruce', bg: '#142E2E', accent: '#0B1D1D', foil: '#D6C084', spineText: '#FAF5EA', rib: '#0F2323' },
  { name: 'Slate Library', bg: '#263747', accent: '#182430', foil: '#DEC997', spineText: '#FAF5EA', rib: '#1D2C3A' },
  { name: 'Crimson Morocco', bg: '#4A1D1D', accent: '#301111', foil: '#E8CC8B', spineText: '#FAF5EA', rib: '#391515' },
  { name: 'Terracotta Cloth', bg: '#3E2218', accent: '#28140D', foil: '#DFC285', spineText: '#FAF5EA', rib: '#311A12' },
  { name: 'Aged Amber Ochre', bg: '#3D2F15', accent: '#271D0B', foil: '#EBD99E', spineText: '#FAF5EA', rib: '#30240F' },
]

export function getBookSpineStyle(title: string, id?: string) {
  let hash = 0
  const key = (id || '') + title
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const absHash = Math.abs(hash)
  const palette = CLOSET_PALETTES[absHash % CLOSET_PALETTES.length]
  const spineNumber = (absHash % 990) + 10

  // Heights: 165px to 215px, Widths: 24px to 42px
  const height = 165 + (absHash % 48)
  const width = 24 + (absHash % 18)

  return {
    palette,
    spineNo: `#${spineNumber.toString().padStart(3, '0')}`,
    numericSpine: spineNumber,
    height,
    width,
  }
}

// ============================================
// 2. Individual Spine Component in 3D Shelf
// ============================================

interface ClosetSpineProps {
  book: Book
  isSelected: boolean
  isHoveredByReticle: boolean
  isSaved: boolean
  onSelect: (book: Book) => void
  onHover: (book: Book | null) => void
}

const ClosetSpine = React.memo(function ClosetSpine({
  book,
  isSelected,
  isHoveredByReticle,
  isSaved,
  onSelect,
  onHover,
}: ClosetSpineProps) {
  const [isMouseHovered, setIsMouseHovered] = React.useState(false)
  const isTargeted = isMouseHovered || isHoveredByReticle
  const styleInfo = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])
  const { palette, spineNo, height, width } = styleInfo

  return (
    <div
      className="relative select-none shrink-0 transition-all duration-200 transform-gpu cursor-pointer"
      style={{
        width,
        height: 220,
        display: 'flex',
        alignItems: 'flex-end',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => {
        setIsMouseHovered(true)
        onHover(book)
      }}
      onMouseLeave={() => {
        setIsMouseHovered(false)
        onHover(null)
      }}
      onClick={() => onSelect(book)}
    >
      {/* Contact Shadow on shelf board */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/80 blur-[2px] pointer-events-none transition-all duration-200"
        style={{
          width: isTargeted || isSelected ? width * 1.3 : width * 0.8,
          height: isTargeted || isSelected ? 8 : 4,
          opacity: isTargeted || isSelected ? 0.9 : 0.45,
        }}
      />

      {/* 3D Physical Spine */}
      <div
        className="relative rounded-t-[3px] rounded-b-[1px] overflow-hidden shadow-lg transition-transform duration-200"
        style={{
          width,
          height,
          backgroundColor: palette.bg,
          transform: isSelected
            ? 'translateZ(36px) translateY(-18px) scale(1.08)'
            : isTargeted
            ? 'translateZ(24px) translateY(-12px) scale(1.05)'
            : 'translateZ(0px) translateY(0px) scale(1)',
          transformOrigin: 'bottom center',
          boxShadow: isTargeted
            ? `0 0 0 1.5px #10B981, 0 10px 25px rgba(0,0,0,0.85)`
            : `inset 0 0 10px rgba(0,0,0,0.65), inset 1px 0 0 rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Saved Stack Heart Badge */}
        {isSaved && (
          <div className="absolute top-1 right-1 z-20 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
        )}

        {/* Top Spine Number Box (Criterion Style) */}
        <div className="absolute top-0 inset-x-0 pt-1 pb-1 flex flex-col items-center border-b border-black/40 bg-black/30">
          <span
            className="text-[7.5px] font-mono font-bold tracking-wider leading-none px-0.5"
            style={{ color: palette.foil, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          >
            {spineNo}
          </span>
        </div>

        {/* Raised Spine Ribs */}
        <div className="absolute top-[32%] inset-x-0 h-[2px] bg-black/50 border-t border-white/15" />
        <div className="absolute bottom-[32%] inset-x-0 h-[2px] bg-black/50 border-b border-white/15" />

        {/* Vertical Title & Author */}
        <div
          className="absolute inset-x-0 top-8 bottom-6 flex flex-col items-center justify-between py-1 px-0.5"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span
            className="text-[8.5px] font-display font-semibold tracking-wide truncate max-h-[110px]"
            style={{
              color: palette.spineText,
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            }}
          >
            {book.title}
          </span>

          {book.author_name && (
            <span
              className="text-[7px] font-serif uppercase tracking-widest truncate max-h-[65px] opacity-85"
              style={{ color: palette.foil }}
            >
              {book.author_name}
            </span>
          )}
        </div>

        {/* Bottom Spine Trim */}
        <div className="absolute bottom-0 inset-x-0 h-2 border-t border-black/40 bg-black/25" />

        {/* Curved Specular Sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 28%, rgba(255,255,255,0.18) 65%, rgba(0,0,0,0.35) 100%)',
          }}
        />
      </div>
    </div>
  )
})

// ============================================
// 3. The 3D Book Inspection Stage (Criterion Closet Style)
// ============================================

interface BookInspectionStageProps {
  book: Book
  allBooks: Book[]
  userPicks: Book[]
  onTogglePick: (book: Book) => void
  onClose: () => void
  onSelectBook: (book: Book) => void
}

function BookInspectionStage({
  book,
  allBooks,
  userPicks,
  onTogglePick,
  onClose,
  onSelectBook,
}: BookInspectionStageProps) {
  const isSaved = userPicks.some((b) => b.id === book.id)
  const styleInfo = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])
  const { palette, spineNo } = styleInfo

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { stiffness: 120, damping: 20, mass: 0.8 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-26, 26])
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [14, -14])
  const shadowX = useTransform(smoothX, [-0.5, 0.5], [-35, 35])

  const [viewAngle, setViewAngle] = React.useState<'dynamic' | 'front' | 'spine' | 'back'>('dynamic')

  React.useEffect(() => {
    mouseX.set(0)
    mouseY.set(0)
    setViewAngle('dynamic')
  }, [book.id, mouseX, mouseY])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && allBooks.length > 0) {
        const currIdx = allBooks.findIndex((b) => b.id === book.id)
        if (currIdx >= 0 && currIdx < allBooks.length - 1) {
          onSelectBook(allBooks[currIdx + 1])
        }
      } else if (e.key === 'ArrowLeft' && allBooks.length > 0) {
        const currIdx = allBooks.findIndex((b) => b.id === book.id)
        if (currIdx > 0) {
          onSelectBook(allBooks[currIdx - 1])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [book.id, allBooks, onClose, onSelectBook])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewAngle !== 'dynamic') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const currentIdx = allBooks.findIndex((b) => b.id === book.id)
  const prevBook = currentIdx > 0 ? allBooks[currentIdx - 1] : null
  const nextBook = currentIdx >= 0 && currentIdx < allBooks.length - 1 ? allBooks[currentIdx + 1] : null

  const bookWidth = 270
  const bookHeight = 390
  const bookDepth = 38

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0) }}
    >
      {/* Background Depth-of-Field Blur Backdrop */}
      <div
        className="fixed inset-0 bg-[#070504]/90 backdrop-blur-2xl"
        onClick={onClose}
      />

      {/* Overhead Spotlight */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 30%, rgba(250, 220, 160, 0.16) 0%, transparent 75%),
            radial-gradient(circle at 50% 50%, transparent 45%, rgba(5, 4, 3, 0.75) 100%)
          `,
        }}
      />

      {/* Previous Volume Arrow */}
      {prevBook && (
        <button
          onClick={() => onSelectBook(prevBook)}
          className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-40 p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white backdrop-blur-xl transition-all hover:scale-110 shadow-2xl group hidden md:flex items-center gap-2"
          title={`Previous volume: ${prevBook.title}`}
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next Volume Arrow */}
      {nextBook && (
        <button
          onClick={() => onSelectBook(nextBook)}
          className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-40 p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white backdrop-blur-xl transition-all hover:scale-110 shadow-2xl group hidden md:flex items-center gap-2"
          title={`Next volume: ${nextBook.title}`}
        >
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 3-Panel Layout: Left Record | Center 3D Book | Right Actions */}
      <div className="relative z-30 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 py-6 pointer-events-auto">

        {/* LEFT PANEL: Archival Record */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full lg:w-80 bg-[#120F0D]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-paper flex flex-col justify-between order-2 lg:order-1 max-h-[520px] overflow-y-auto scrollbar-thin"
        >
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase mb-2">
              SYNOPSIS / ARCHIVAL RECORD
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight mb-1">
              {book.title}
            </h3>

            {book.author_name && (
              <p className="text-xs text-amber-200/90 mb-4 font-sans">
                by{' '}
                {book.author_id ? (
                  <Link
                    href={`/authors/${book.author_id}`}
                    className="underline decoration-amber-400/50 hover:decoration-amber-400 hover:text-white"
                  >
                    {book.author_name}
                  </Link>
                ) : (
                  book.author_name
                )}
              </p>
            )}

            {/* Discussion & Archival Stats */}
            <div className="space-y-2 py-3 my-3 border-y border-white/10 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-white/40 uppercase text-[10px]">Discussions</span>
                <span className="text-amber-300 font-bold font-display">{book.discussion_count} Meetups</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 uppercase text-[10px]">First Discussed</span>
                <span className="text-white/80">
                  {book.first_discussed_date ? formatDate(book.first_discussed_date) : 'BBB Archive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 uppercase text-[10px]">Archive Location</span>
                <span className="text-white/80">Bangalore, India</span>
              </div>
            </div>

            {/* Picked by BBB Readers (Criterion Guests Row) */}
            <div className="mt-4">
              <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase mb-2.5">
                PICKED BY CRITERION READERS
              </div>
              {book.members && book.members.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto scrollbar-thin">
                  {book.members.map((member, idx) => (
                    <Link
                      key={`member-${member.id || idx}`}
                      href={`/members/${member.id}`}
                      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-950/70 border border-white/10 hover:border-amber-500/50 text-[11px] text-amber-200 hover:text-white transition-colors"
                      title={member.display_name}
                    >
                      <div className="w-4 h-4 rounded-full bg-amber-600/80 text-black text-[9px] font-bold flex items-center justify-center">
                        {member.display_name.slice(0, 1)}
                      </div>
                      <span className="truncate max-w-[90px]">{member.display_name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">
                  Preserved in BBB Bangalore community archives.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/40">
            <span>SPINE NO. {spineNo.replace('#', '')}</span>
            <span className="text-amber-400/70">BBB ARCHIVE</span>
          </div>
        </motion.div>

        {/* CENTER PANEL: Large 3D Tactile Book Hero */}
        <motion.div
          initial={{ scale: 0.8, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 20, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex flex-col items-center justify-center order-1 lg:order-2 select-none"
          style={{ perspective: '1400px' }}
        >
          {/* Dynamic Contact Shadow */}
          <motion.div
            className="absolute -bottom-10 rounded-full bg-black/80 blur-2xl pointer-events-none"
            style={{
              width: bookWidth * 1.3,
              height: 44,
              x: shadowX,
            }}
          />

          {/* 3D Physical Book Volume */}
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
              {/* Linen texture */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.25'%3E%3Cpath d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              {/* Gold Foil Border */}
              <div
                className="absolute inset-3.5 border rounded-sm pointer-events-none"
                style={{
                  borderColor: `${palette.foil}50`,
                  boxShadow: `inset 0 0 1px 1px ${palette.foil}30, 0 0 1px ${palette.foil}35`,
                }}
              />

              {/* Cover Typography */}
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
                      style={{ color: palette.foil, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
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
                    {spineNo} · BANGALORE
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

            {/* SPINE */}
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
                <span className="text-[9px] font-mono tracking-widest opacity-90" style={{ color: palette.foil }}>
                  {spineNo}
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
                background: 'linear-gradient(90deg, #F4ECE0 0%, #E8E0D4 50%, #D8CFC2 100%)',
                transform: `rotateY(90deg) translateZ(${bookWidth - bookDepth / 2}px)`,
                transformOrigin: 'right center',
                backfaceVisibility: 'hidden',
              }}
            />

            {/* TOP PAGE EDGE */}
            <div
              className="absolute"
              style={{
                width: bookWidth,
                height: bookDepth,
                left: 0,
                top: 0,
                background: 'linear-gradient(180deg, #F4ECE0 0%, #DFD6C8 100%)',
                transform: 'rotateX(90deg) translateZ(0px)',
                transformOrigin: 'top center',
                backfaceVisibility: 'hidden',
              }}
            />

            {/* BOTTOM PAGE EDGE */}
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

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 mt-7 bg-black/60 border border-white/15 rounded-full px-3 py-1 backdrop-blur-xl shadow-lg">
            {(['dynamic', 'front', 'spine', 'back'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewAngle(mode)}
                className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all ${
                  viewAngle === mode ? 'bg-amber-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                {mode === 'dynamic' ? '3D Interactive' : mode === 'front' ? 'Front' : mode === 'spine' ? 'Spine' : 'Back'}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-white/40 mt-2 font-mono tracking-wider">
            Move mouse to turn · Click background or press ESC to put it back
          </p>
        </motion.div>

        {/* RIGHT PANEL: Read It / Closet Picks / Meetups */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="w-full lg:w-80 bg-[#120F0D]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-paper flex flex-col justify-between order-3 max-h-[520px] overflow-y-auto scrollbar-thin"
        >
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase mb-2">
              READ IT / ARCHIVAL RECORD
            </div>

            {/* Primary Action */}
            <Link
              href={`/books/${book.id}`}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 hover:bg-amber-100 hover:scale-[1.02] active:scale-[0.98] mb-3"
            >
              <span>Examine Full Record</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Add to Closet Picks */}
            <div className="my-4 pt-3 border-t border-white/10">
              <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase mb-2">
                YOUR CLOSET PICKS
              </div>

              <button
                onClick={() => onTogglePick(book)}
                className={`w-full py-2.5 px-4 rounded-xl border font-sans text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isSaved
                    ? 'bg-amber-600/90 border-amber-400/60 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/80 hover:text-white'
                }`}
              >
                <span>{isSaved ? '❤️ In Your Stack (Click to Remove)' : '+ Add to Closet Picks'}</span>
              </button>
            </div>

            {/* BBB Meetups Mentioned */}
            <div className="my-4 pt-3 border-t border-white/10">
              <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase mb-2">
                BBB MEETUPS DISCUSSED ({book.meetups?.length || 0})
              </div>
              {book.meetups && book.meetups.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {book.meetups.map((m, idx) => (
                    <Link
                      key={`meetup-${m.id || idx}`}
                      href={`/meetups/${m.number}`}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-paper hover:text-white transition-colors"
                    >
                      <span className="font-semibold text-amber-300">Meetup #{m.number}</span>
                      <span className="text-[11px] text-white/50">
                        {m.date ? formatDate(m.date) : m.venue || 'Bangalore'}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">
                  Archived from community discussion lists.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white font-mono flex items-center gap-1"
            >
              <span>← Return to Closet</span>
            </button>
            <span className="text-[10px] font-mono text-white/30">ESC</span>
          </div>
        </motion.div>

      </div>

      {/* Floating Bottom Center Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-5 inset-x-0 mx-auto w-fit z-40 pointer-events-auto"
      >
        <div className="bg-[#120F0D]/95 border border-white/15 rounded-full px-5 py-2 backdrop-blur-2xl shadow-2xl flex items-center gap-4 text-xs">
          <span className="font-mono text-amber-400 font-bold">{spineNo}</span>
          <span className="h-3 w-px bg-white/20" />
          <span className="font-serif font-medium text-white max-w-[200px] sm:max-w-[300px] truncate">
            {book.title}
          </span>
          {book.author_name && (
            <>
              <span className="h-3 w-px bg-white/20 hidden sm:inline" />
              <span className="text-white/60 hidden sm:inline truncate max-w-[150px]">
                {book.author_name}
              </span>
            </>
          )}
          <button
            onClick={() => onTogglePick(book)}
            className="p-1 rounded hover:bg-white/10 text-amber-300"
            title={isSaved ? 'Remove from stack' : 'Add to stack'}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// 4. "Your Closet Picks" Tray
// ============================================

interface PicksTrayProps {
  userPicks: Book[]
  isOpen: boolean
  onClose: () => void
  onSelectBook: (book: Book) => void
  onRemovePick: (bookId: string) => void
  onOpenPolaroid: () => void
}

function PicksTray({
  userPicks,
  isOpen,
  onClose,
  onSelectBook,
  onRemovePick,
  onOpenPolaroid,
}: PicksTrayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        className="relative z-10 w-full max-w-xl bg-[#14100D]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center"
      >
        <div className="text-[10px] font-mono tracking-[0.25em] text-white/50 uppercase mb-1">
          THE CRITERION CLOSET TOTE BAG
        </div>
        <h3 className="font-display text-2xl font-bold text-white mb-2">
          Your Four Closet Picks
        </h3>
        <p className="text-xs text-white/60 mb-6 font-serif">
          Curate your personal 4-volume stack from the BBB Archive shelves.
        </p>

        {/* 4 Pick Slots */}
        <div className="grid grid-cols-4 gap-3 my-4">
          {Array.from({ length: 4 }).map((_, idx) => {
            const book = userPicks[idx]
            if (book) {
              const styleInfo = getBookSpineStyle(book.title, book.id)
              return (
                <div
                  key={`pick-${book.id}`}
                  className="group relative h-40 rounded-xl border border-white/15 hover:border-amber-400/70 p-2.5 flex flex-col items-center justify-between cursor-pointer transition-all shadow-lg"
                  style={{ backgroundColor: `${styleInfo.palette.bg}EE` }}
                  onClick={() => {
                    onClose()
                    onSelectBook(book)
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemovePick(book.id)
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 border border-white/25 text-white/70 hover:text-white hover:bg-red-900 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    ✕
                  </button>
                  <span className="text-[8px] font-mono" style={{ color: styleInfo.palette.foil }}>
                    {styleInfo.spineNo}
                  </span>
                  <span className="text-[10px] font-display font-bold text-white line-clamp-3 text-center my-auto">
                    {book.title}
                  </span>
                  <span className="text-[7.5px] uppercase font-serif text-amber-300">
                    Examine
                  </span>
                </div>
              )
            }

            return (
              <div
                key={`empty-slot-${idx}`}
                className="h-40 rounded-xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center p-3 text-center text-white/30"
              >
                <span className="text-xl mb-1.5">♡</span>
                <span className="text-[9px] font-mono">Empty Slot</span>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {userPicks.length > 0 && (
            <button
              onClick={() => {
                onClose()
                onOpenPolaroid()
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>📸 Take a Polaroid</span>
              <span className="text-[10px] opacity-75">({userPicks.length}/4)</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs tracking-wider uppercase transition-all border border-white/15"
          >
            Keep Browsing
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// 5. The Signature Polaroid Generator
// ============================================

interface PolaroidModalProps {
  userPicks: Book[]
  isOpen: boolean
  onClose: () => void
}

function PolaroidModal({
  userPicks,
  isOpen,
  onClose,
}: PolaroidModalProps) {
  const [signee, setSignee] = React.useState('Broke Bibliophile')
  const [isCopied, setIsCopied] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)

  if (!isOpen) return null

  // HTML5 Canvas Polaroid Renderer
  const handleDownload = () => {
    setIsDownloading(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 1000
      canvas.height = 1200

      // White Polaroid Border
      ctx.fillStyle = '#FAF8F5'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Photo Stage
      const photoX = 60
      const photoY = 60
      const photoW = 880
      const photoH = 880

      const grad = ctx.createRadialGradient(
        photoX + photoW / 2, photoY + photoH * 0.4, 50,
        photoX + photoW / 2, photoY + photoH / 2, photoW * 0.7
      )
      grad.addColorStop(0, '#221B17')
      grad.addColorStop(1, '#090706')
      ctx.fillStyle = grad
      ctx.fillRect(photoX, photoY, photoW, photoH)

      // Wooden Shelf Plank
      const plankY = photoY + photoH - 120
      ctx.fillStyle = '#3E2A1D'
      ctx.fillRect(photoX, plankY, photoW, 120)
      ctx.fillStyle = '#C69947'
      ctx.fillRect(photoX, plankY, photoW, 4)

      // Draw books
      const picksCount = userPicks.length
      const slotWidth = photoW / (picksCount || 1)

      userPicks.forEach((book, i) => {
        const style = getBookSpineStyle(book.title, book.id)
        const bookW = Math.min(140, slotWidth * 0.75)
        const bookH = 260
        const bookX = photoX + slotWidth * i + (slotWidth - bookW) / 2
        const bookY = plankY - bookH + 10

        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.beginPath()
        ctx.ellipse(bookX + bookW / 2, plankY + 8, bookW * 0.65, 12, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = style.palette.bg
        ctx.fillRect(bookX, bookY, bookW, bookH)

        ctx.strokeStyle = style.palette.foil
        ctx.lineWidth = 1.5
        ctx.strokeRect(bookX + 6, bookY + 6, bookW - 12, bookH - 12)

        ctx.fillStyle = style.palette.foil
        ctx.font = 'bold 13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(style.spineNo, bookX + bookW / 2, bookY + 28)

        ctx.fillStyle = '#FAF7F0'
        ctx.font = 'bold 15px Georgia'
        const words = book.title.split(' ')
        let line = ''
        let curY = bookY + 80
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' '
          const metrics = ctx.measureText(testLine)
          if (metrics.width > bookW - 24 && n > 0) {
            ctx.fillText(line, bookX + bookW / 2, curY)
            line = words[n] + ' '
            curY += 20
            if (curY > bookY + 180) break
          } else {
            line = testLine
          }
        }
        ctx.fillText(line, bookX + bookW / 2, curY)

        if (book.author_name) {
          ctx.fillStyle = style.palette.foil
          ctx.font = 'italic 12px Georgia'
          ctx.fillText(book.author_name.slice(0, 18), bookX + bookW / 2, curY + 28)
        }
      })

      // Signature & Stamp
      ctx.fillStyle = '#1C1917'
      ctx.font = 'italic bold 42px Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText(`“${signee}”`, photoX + 20, photoY + photoH + 110)

      ctx.fillStyle = '#78716C'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('THE CRITERION CLOSET · BBB BANGALORE', photoX + photoW - 20, photoY + photoH + 105)

      const link = document.createElement('a')
      link.download = `bbb-closet-picks-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Failed to export polaroid:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopy = () => {
    const text = `My BBB Closet Picks:\n${userPicks.map((b) => `• ${b.title}`).join('\n')}\n— Curated at The BBB Book Closet`
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-2xl" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 25 }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center"
      >
        {/* POLAROID FRAME */}
        <div className="w-full bg-[#FAF8F5] p-5 pb-7 rounded-sm shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-neutral-300 flex flex-col items-center">
          
          <div className="relative w-full aspect-square bg-[#100D0B] rounded-[2px] overflow-hidden flex flex-col justify-end p-4 shadow-inner border border-black/30">
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 80% 60% at 50% 35%, rgba(245, 215, 150, 0.15) 0%, transparent 70%),
                  linear-gradient(180deg, #181310 0%, #0A0807 100%)
                `,
              }}
            />

            <div className="absolute inset-x-0 bottom-0 h-16 bg-[#322013] border-t-2 border-amber-600/70 shadow-2xl" />

            <div className="relative z-10 flex items-end justify-center gap-2 sm:gap-3 mb-1">
              {userPicks.map((book) => {
                const style = getBookSpineStyle(book.title, book.id)
                return (
                  <div
                    key={`polaroid-book-${book.id}`}
                    className="relative w-16 sm:w-20 h-44 sm:h-52 rounded-[2px] p-2 flex flex-col justify-between shadow-2xl border"
                    style={{
                      backgroundColor: style.palette.bg,
                      borderColor: `${style.palette.foil}60`,
                    }}
                  >
                    <span className="text-[7.5px] font-mono text-center" style={{ color: style.palette.foil }}>
                      {style.spineNo}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-display font-bold text-white text-center line-clamp-3 leading-tight my-auto">
                      {book.title}
                    </span>
                    <span className="text-[7px] font-serif text-amber-200/80 uppercase text-center truncate">
                      {book.author_name || 'BBB'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="w-full mt-4 flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                GUEST CURATOR SIGNATURE:
              </span>
              <input
                type="text"
                value={signee}
                onChange={(e) => setSignee(e.target.value)}
                placeholder="sign here"
                className="bg-transparent border-b border-neutral-300 font-serif italic text-lg text-neutral-900 focus:outline-none focus:border-amber-600 w-48 mt-0.5"
              />
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-neutral-800 tracking-wider block">
                THE BBB CLOSET
              </span>
              <span className="text-[8.5px] font-mono text-neutral-500 uppercase">
                Bangalore Archive
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-amber-100 shadow-xl flex items-center gap-2"
          >
            <span>{isDownloading ? 'Generating…' : '↓ Download Polaroid'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-5 py-2.5 rounded-full bg-black/60 border border-white/20 hover:bg-black/80 text-white font-medium text-xs tracking-wider uppercase transition-all backdrop-blur-xl shadow-lg"
          >
            <span>{isCopied ? '✓ Copied List!' : 'Share Picks'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-white/60 hover:text-white text-xs font-mono"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// 6. Master Criterion Walk-In Corner Closet Component
// ============================================

export function CriterionBookCloset() {
  const searchParams = useSearchParams()
  const selectParam = searchParams.get('select')

  // View Mode: 'closet' | 'list'
  const [viewMode, setViewMode] = React.useState<'closet' | 'list'>('closet')

  const [books, setBooks] = React.useState<Book[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null)
  const [hoveredBook, setHoveredBook] = React.useState<Book | null>(null)

  // Green circular reticle cursor position
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 })

  // Floating controls & filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSearchFocused, setIsSearchFocused] = React.useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [discussionFilter, setDiscussionFilter] = React.useState<'all' | 'popular' | 'two-plus' | 'single'>('all')
  const [selectedLetter, setSelectedLetter] = React.useState<string | null>(null)
  const [sortBy, setSortBy] = React.useState<'spine-asc' | 'spine-desc' | 'title-asc' | 'discussions-desc' | 'recent'>('spine-asc')

  // Tote Bag / User Picks (4 volumes max)
  const [userPicks, setUserPicks] = React.useState<Book[]>([])
  const [isPicksTrayOpen, setIsPicksTrayOpen] = React.useState(false)
  const [isPolaroidOpen, setIsPolaroidOpen] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Camera yaw & pitch for 3D Walk-in Corner Closet
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { stiffness: 45, damping: 20, mass: 1 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // Camera swivel: yaw between -18° and +18°, pitch between -10° and +10°
  const camRotateY = useTransform(smoothX, [-0.5, 0.5], [-18, 18])
  const camRotateX = useTransform(smoothY, [-0.5, 0.5], [10, -10])

  // Sync hash #closet / #list
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash === '#list' || hash === '#wall') {
        setViewMode('list')
      } else if (hash === '#closet') {
        setViewMode('closet')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const switchView = (mode: 'closet' | 'list') => {
    setViewMode(mode)
    window.history.replaceState(null, '', mode === 'list' ? '#list' : '#closet')
  }

  // Load user picks
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('bbb_closet_picks')
      if (saved) setUserPicks(JSON.parse(saved))
    } catch {}
  }, [])

  React.useEffect(() => {
    try {
      localStorage.setItem('bbb_closet_picks', JSON.stringify(userPicks))
    } catch {}
  }, [userPicks])

  // Fetch books
  React.useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true)
        const data = await fetchBooks({ limit: 3000 })
        setBooks(data)
      } catch (err) {
        console.error('Failed to load books for closet:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBooks()
  }, [])

  // Deep linking ?select=<id>
  React.useEffect(() => {
    if (!selectParam || books.length === 0) return
    const target = books.find((b) => b.id === selectParam)
    if (target) setSelectedBook(target)
  }, [selectParam, books])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
        e.preventDefault()
        document.getElementById('closet-search-input')?.focus()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setIsFilterSheetOpen((prev) => !prev)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRandomPick()
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        setIsPicksTrayOpen((prev) => !prev)
      } else if ((e.key === 's' || e.key === 'S') && userPicks.length > 0) {
        e.preventDefault()
        setIsPolaroidOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [userPicks, books])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleTogglePick = (book: Book) => {
    setUserPicks((prev) => {
      const exists = prev.some((b) => b.id === book.id)
      if (exists) {
        showToast(`Removed “${book.title}” from your stack`)
        return prev.filter((b) => b.id !== book.id)
      }
      if (prev.length >= 4) {
        showToast(`Your 4 picks are full! Replaced oldest volume.`)
        return [...prev.slice(1), book]
      }
      showToast(`+ Added “${book.title}” to your closet picks`)
      return [...prev, book]
    })
  }

  const handleRemovePick = (bookId: string) => {
    setUserPicks((prev) => prev.filter((b) => b.id !== bookId))
  }

  const handleRandomPick = () => {
    if (books.length === 0) return
    const randomIdx = Math.floor(Math.random() * books.length)
    const pick = books[randomIdx]
    if (pick) setSelectedBook(pick)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    setCursorPos({ x: clientX, y: clientY })
    if (selectedBook) return
    const { innerWidth, innerHeight } = window
    mouseX.set(clientX / innerWidth - 0.5)
    mouseY.set(clientY / innerHeight - 0.5)
  }

  // Filtered & Sorted Books
  const filteredBooks = React.useMemo(() => {
    let list = [...books]

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          (b.author_name || '').toLowerCase().includes(query)
      )
    }

    if (discussionFilter === 'popular') {
      list = list.filter((b) => b.discussion_count >= 3)
    } else if (discussionFilter === 'two-plus') {
      list = list.filter((b) => b.discussion_count >= 2)
    } else if (discussionFilter === 'single') {
      list = list.filter((b) => b.discussion_count === 1)
    }

    if (selectedLetter) {
      list = list.filter((b) => b.title.trim().toUpperCase().startsWith(selectedLetter))
    }

    if (sortBy === 'title-asc') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'discussions-desc') {
      list.sort((a, b) => b.discussion_count - a.discussion_count)
    } else if (sortBy === 'recent') {
      list.sort((a, b) => (b.first_discussed_date || '').localeCompare(a.first_discussed_date || ''))
    } else if (sortBy === 'spine-desc') {
      list.sort((a, b) => {
        const spineA = getBookSpineStyle(a.title, a.id).numericSpine
        const spineB = getBookSpineStyle(b.title, b.id).numericSpine
        return spineB - spineA
      })
    } else {
      list.sort((a, b) => {
        const spineA = getBookSpineStyle(a.title, a.id).numericSpine
        const spineB = getBookSpineStyle(b.title, b.id).numericSpine
        return spineA - spineB
      })
    }

    return list
  }, [books, searchQuery, discussionFilter, selectedLetter, sortBy])

  // Split books between Left Wall & Right Wall, across 6 vertical tiers each
  const { leftRows, rightRows } = React.useMemo(() => {
    const totalTiers = 6
    const left: Book[][] = Array.from({ length: totalTiers }, () => [])
    const right: Book[][] = Array.from({ length: totalTiers }, () => [])

    // Limit shelf display books to first 400 for 60fps buttery smooth CSS 3D corner performance
    const displayPool = filteredBooks.slice(0, 360)
    const midPoint = Math.ceil(displayPool.length / 2)
    const leftPool = displayPool.slice(0, midPoint)
    const rightPool = displayPool.slice(midPoint)

    leftPool.forEach((book, idx) => {
      left[idx % totalTiers].push(book)
    })
    rightPool.forEach((book, idx) => {
      right[idx % totalTiers].push(book)
    })

    return { leftRows: left, rightRows: right }
  }, [filteredBooks])

  const searchSuggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return []
    return filteredBooks.slice(0, 6)
  }, [filteredBooks, searchQuery])

  const activeFiltersCount = (discussionFilter !== 'all' ? 1 : 0) + (selectedLetter ? 1 : 0)

  return (
    <div
      className={`relative min-h-screen w-screen transition-colors duration-500 overflow-x-hidden ${
        viewMode === 'closet' ? 'bg-[#070709] text-paper cursor-crosshair' : 'bg-[#F3EFE6] text-[#14130F]'
      }`}
      onMouseMove={handleMouseMove}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 inset-x-0 mx-auto w-fit z-50 px-5 py-2 rounded-full bg-black/90 border border-white/20 text-white text-xs font-mono shadow-2xl backdrop-blur-xl pointer-events-none"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* GREEN RETICLE CURSOR (Criterion Closet Style from Recording 00:14) */}
      {viewMode === 'closet' && !selectedBook && (
        <div
          className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-5 h-5 rounded-full border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-emerald-300" />
          </div>
        </div>
      )}

      {/* =======================================================
          1. THE CRITERION CLOSET CHROME & MARQUEE
          ======================================================= */}
      <header
        className={`sticky top-0 z-40 w-full transition-colors duration-300 border-b backdrop-blur-xl ${
          viewMode === 'closet'
            ? 'bg-[#0E0D0B]/85 border-white/10 text-paper'
            : 'bg-[#F3EFE6]/90 border-[#DDD6C7] text-[#14130F]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Brand & Left Tools */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <Link href="/" className="flex items-center gap-2 group">
              <span
                className={`font-black text-xl sm:text-2xl tracking-[0.18em] transition-colors ${
                  viewMode === 'closet' ? 'text-white group-hover:text-amber-300' : 'text-[#14130F] group-hover:text-amber-800'
                }`}
              >
                THE CLOSET
              </span>
            </Link>
            <span
              className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded border uppercase ${
                viewMode === 'closet'
                  ? 'border-white/20 text-amber-300 bg-black/40'
                  : 'border-[#DDD6C7] text-neutral-600 bg-white/60'
              }`}
            >
              BBB Bangalore
            </span>

            {/* Mobile View Switcher */}
            <div className="flex md:hidden items-center p-1 rounded-full border border-current/20">
              <button
                onClick={() => switchView('list')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  viewMode === 'list' ? 'bg-[#14130F] text-white' : 'opacity-60'
                }`}
              >
                List
              </button>
              <button
                onClick={() => switchView('closet')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  viewMode === 'closet' ? 'bg-amber-600 text-white' : 'opacity-60'
                }`}
              >
                Closet
              </button>
            </div>
          </div>

          {/* Center: HANGING CLOSET PICKS MARQUEE (Exact Match with 00:14 of video) */}
          <div className="hidden lg:flex items-center gap-2 px-5 py-1.5 rounded-full bg-black/70 border border-white/20 shadow-2xl backdrop-blur-xl">
            <span className="font-mono text-[10px] tracking-[0.25em] text-white/80 font-bold uppercase">
              CLOSET PICKS
            </span>
            <div className="flex items-center gap-1.5 ml-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <button
                  key={`marquee-slot-${i}`}
                  onClick={() => setIsPicksTrayOpen(true)}
                  className={`w-4 h-5 rounded-[2px] border transition-all flex items-center justify-center text-[8px] ${
                    i < userPicks.length
                      ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_8px_rgba(251,191,36,0.95)]'
                      : 'bg-white/5 border-white/20 text-white/30 hover:border-white/40'
                  }`}
                  title={userPicks[i]?.title || 'Empty pick slot'}
                >
                  {i < userPicks.length ? '★' : '♡'}
                </button>
              ))}
            </div>
            {userPicks.length > 0 && (
              <button
                onClick={() => setIsPolaroidOpen(true)}
                className="ml-2 text-[9px] font-mono text-amber-300 hover:underline uppercase tracking-wider"
              >
                Polaroid ↗
              </button>
            )}
          </div>

          {/* Right: Quick Tools & View Switcher */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <Link
              href="/admin"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                viewMode === 'closet'
                  ? 'bg-black/50 border-white/15 text-white/80 hover:text-white hover:border-amber-400'
                  : 'bg-white border-[#DDD6C7] text-neutral-700 hover:text-black'
              }`}
              title="Manage Meetups, Books and Database"
            >
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Manage DB</span>
            </Link>
            {/* Search Box */}
            <div className="relative flex-1 md:w-52">
              <input
                id="closet-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                placeholder="Title, author, spine #…"
                className={`w-full px-3.5 py-1.5 rounded-xl text-xs border transition-all focus:outline-none ${
                  viewMode === 'closet'
                    ? 'bg-black/50 border-white/15 text-white placeholder-white/40 focus:border-amber-400'
                    : 'bg-white border-[#DDD6C7] text-[#14130F] placeholder-neutral-400 focus:border-black'
                }`}
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-40 font-mono hidden sm:inline">
                /
              </kbd>

              {/* Suggestions */}
              <AnimatePresence>
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-[#120F0D] border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 space-y-1"
                  >
                    {searchSuggestions.map((book) => {
                      const style = getBookSpineStyle(book.title, book.id)
                      return (
                        <button
                          key={`sug-${book.id}`}
                          onMouseDown={() => {
                            setSelectedBook(book)
                            setSearchQuery('')
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-mono text-amber-300 font-bold">
                              {style.spineNo}
                            </span>
                            <span className="text-xs text-white truncate font-serif">
                              {book.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/50 shrink-0 ml-2">
                            {book.author_name || 'BBB'}
                          </span>
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeFiltersCount > 0
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : viewMode === 'closet'
                  ? 'bg-black/50 border-white/15 text-white/80 hover:text-white'
                  : 'bg-white border-[#DDD6C7] text-neutral-700 hover:text-black'
              }`}
            >
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Desktop Sliding Pill Switcher */}
            <nav
              className="hidden md:flex relative items-center p-1 rounded-full border shadow-sm"
              style={{
                backgroundColor: viewMode === 'closet' ? 'rgba(255,255,255,0.06)' : '#FAF8F4',
                borderColor: viewMode === 'closet' ? 'rgba(255,255,255,0.15)' : '#DDD6C7',
              }}
            >
              <button
                onClick={() => switchView('list')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'text-white'
                    : viewMode === 'closet'
                    ? 'text-white/60 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                List View
              </button>

              <button
                onClick={() => switchView('closet')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  viewMode === 'closet'
                    ? 'text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Closet View
              </button>

              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="absolute top-1 bottom-1 rounded-full shadow-md"
                style={{
                  backgroundColor: viewMode === 'closet' ? '#C69947' : '#14130F',
                  left: viewMode === 'list' ? 4 : 'calc(50% + 2px)',
                  width: 'calc(50% - 6px)',
                }}
              />
            </nav>
          </div>
        </div>
      </header>

      {/* =======================================================
          2. VIEW MODE A: 3D CORNER WALK-IN CLOSET (1:1 with Recording 00:14)
          ======================================================= */}
      {viewMode === 'closet' && (
        <main
          className="relative w-full h-[calc(100vh-64px)] overflow-hidden flex items-center justify-center select-none"
          style={{
            perspective: '1100px',
            filter: selectedBook ? 'blur(16px) brightness(0.25) contrast(0.95)' : 'none',
            pointerEvents: selectedBook ? 'none' : 'auto',
          }}
        >
          {/* Ambient Lighting & Room Vignette */}
          <div
            className="fixed inset-0 pointer-events-none z-0 opacity-55"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 70% 50% at 50% 40%, rgba(245, 215, 150, 0.12) 0%, transparent 60%),
                radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.85) 100%)
              `,
            }}
          />

          {loading ? (
            <div className="text-center space-y-3 z-10">
              <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-serif text-xs text-amber-200/60 uppercase tracking-widest">
                Shelving the collection…
              </p>
            </div>
          ) : (
            /* 3D CAMERA RIG */
            <motion.div
              className="absolute top-1/2 left-1/2 w-0 h-0"
              style={{
                transformStyle: 'preserve-3d',
                rotateY: camRotateY,
                rotateX: camRotateX,
                translateZ: -120,
              }}
            >
              {/* =======================================================
                  LEFT SHELVING WALL (Angled at 44 degrees meeting in corner)
                  ======================================================= */}
              <div
                className="absolute top-[-360px] right-0 flex flex-col justify-center gap-3.5"
                style={{
                  width: '1350px',
                  transformOrigin: 'right center',
                  transform: 'rotateY(44deg) translateZ(-260px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {leftRows.map((rowBooks, rIdx) => (
                  <div key={`left-row-${rIdx}`} className="relative flex flex-col">
                    {/* Books on Left Shelf */}
                    <div className="flex items-end px-4 space-x-[2px] overflow-hidden justify-end">
                      {rowBooks.map((book) => (
                        <ClosetSpine
                          key={`l-${book.id}`}
                          book={book}
                          isSelected={selectedBook?.id === book.id}
                          isHoveredByReticle={hoveredBook?.id === book.id}
                          isSaved={userPicks.some((b) => b.id === book.id)}
                          onSelect={(b) => setSelectedBook(b)}
                          onHover={(b) => setHoveredBook(b)}
                        />
                      ))}
                    </div>

                    {/* Shelf Plank with Brass Trim */}
                    <div className="relative h-4 -mt-0.5 mx-1 z-10">
                      <div
                        className="absolute inset-x-0 h-full rounded-b-sm overflow-hidden"
                        style={{
                          background: 'linear-gradient(180deg, #382416 0%, #24160C 60%, #120A05 100%)',
                          boxShadow: '0 8px 18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.12)',
                        }}
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 h-[2px]"
                        style={{
                          background: 'linear-gradient(90deg, #785526 0%, #C99E52 50%, #785526 100%)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* =======================================================
                  RIGHT SHELVING WALL (Angled at -44 degrees meeting in corner)
                  ======================================================= */}
              <div
                className="absolute top-[-360px] left-0 flex flex-col justify-center gap-3.5"
                style={{
                  width: '1350px',
                  transformOrigin: 'left center',
                  transform: 'rotateY(-44deg) translateZ(-260px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {rightRows.map((rowBooks, rIdx) => (
                  <div key={`right-row-${rIdx}`} className="relative flex flex-col">
                    {/* Books on Right Shelf */}
                    <div className="flex items-end px-4 space-x-[2px] overflow-hidden justify-start">
                      {rowBooks.map((book) => (
                        <ClosetSpine
                          key={`r-${book.id}`}
                          book={book}
                          isSelected={selectedBook?.id === book.id}
                          isHoveredByReticle={hoveredBook?.id === book.id}
                          isSaved={userPicks.some((b) => b.id === book.id)}
                          onSelect={(b) => setSelectedBook(b)}
                          onHover={(b) => setHoveredBook(b)}
                        />
                      ))}
                    </div>

                    {/* Shelf Plank with Brass Trim */}
                    <div className="relative h-4 -mt-0.5 mx-1 z-10">
                      <div
                        className="absolute inset-x-0 h-full rounded-b-sm overflow-hidden"
                        style={{
                          background: 'linear-gradient(180deg, #382416 0%, #24160C 60%, #120A05 100%)',
                          boxShadow: '0 8px 18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.12)',
                        }}
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 h-[2px]"
                        style={{
                          background: 'linear-gradient(90deg, #785526 0%, #C99E52 50%, #785526 100%)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Floating Left Stack Toolbar (Matching Recording 00:14) */}
          <nav className="fixed left-5 top-20 z-40 hidden md:flex flex-col items-start gap-2.5 pointer-events-auto">
            <button
              onClick={() => document.getElementById('closet-search-input')?.focus()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white text-xs font-mono backdrop-blur-xl shadow-lg transition-all"
            >
              <span>Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">/</kbd>
            </button>

            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white text-xs font-mono backdrop-blur-xl shadow-lg transition-all"
            >
              <span>Filters</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">F</kbd>
            </button>

            <button
              onClick={handleRandomPick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white text-xs font-mono backdrop-blur-xl shadow-lg transition-all"
            >
              <span>Random</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">R</kbd>
            </button>
          </nav>

          {/* Floating Bottom-Left Hovered Case Card (Exact Match with 00:14-00:24 of video) */}
          <div className="fixed bottom-6 left-6 z-40 pointer-events-none">
            {hoveredBook && !selectedBook && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#120F0D]/95 border border-white/15 rounded-xl p-3.5 shadow-2xl backdrop-blur-xl text-left max-w-xs pointer-events-auto"
              >
                <span className="text-xs font-mono text-amber-400 font-bold block mb-0.5">
                  {getBookSpineStyle(hoveredBook.title, hoveredBook.id).spineNo}
                </span>
                <h4 className="font-display text-sm font-bold text-white line-clamp-1 leading-snug">
                  {hoveredBook.title}
                </h4>
                <p className="text-[11px] text-white/60 font-serif line-clamp-1 mt-0.5">
                  {hoveredBook.author_name || 'BBB Archive'} {hoveredBook.first_discussed_date ? `· ${new Date(hoveredBook.first_discussed_date).getFullYear()}` : ''} · Bangalore
                </p>
                <span className="text-[9.5px] font-mono text-emerald-400 block mt-2">
                  ● Click to pull from shelf
                </span>
              </motion.div>
            )}
          </div>
        </main>
      )}

      {/* =======================================================
          3. VIEW MODE B: LIST VIEW / THE CRITERION WALL (Recording 00:00)
          ======================================================= */}
      {viewMode === 'list' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Sub-bar (Showing X of Y volumes) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#DDD6C7] gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">
                Showing {filteredBooks.length.toLocaleString()} of {books.length.toLocaleString()} Volumes
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setDiscussionFilter('all')
                    setSelectedLetter(null)
                    setSearchQuery('')
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#14130F] text-white text-[10px] font-semibold"
                >
                  All Books
                </button>
                <button
                  onClick={() => setDiscussionFilter('popular')}
                  className="px-2.5 py-1 rounded-full bg-white border border-[#DDD6C7] text-neutral-700 text-[10px] font-semibold hover:bg-neutral-100"
                >
                  ★ Community Favorites
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <Link href="/meetups" className="underline text-neutral-700 hover:text-black">
                Meetups Archive →
              </Link>
              <Link href="/members" className="underline text-neutral-700 hover:text-black">
                Readers Directory →
              </Link>
            </div>
          </div>

          {/* Wall Grid Cards (5:7 ratio with top black SPINE banner as in 00:00) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-5">
            {filteredBooks.map((book) => {
              const style = getBookSpineStyle(book.title, book.id)
              const isSaved = userPicks.some((b) => b.id === book.id)

              return (
                <div
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className="group flex flex-col cursor-pointer text-left select-none transition-transform hover:-translate-y-1"
                >
                  {/* Card Front */}
                  <div
                    className="relative w-full aspect-[5/7] rounded-sm overflow-hidden shadow-md group-hover:shadow-xl transition-all border border-[#DDD6C7] flex flex-col justify-between"
                    style={{ backgroundColor: style.palette.bg }}
                  >
                    {/* Top Spine Banner (Exact Match: SPINE X) */}
                    <div className="w-full bg-[#14130F] px-2.5 py-1 flex items-center justify-between z-10 border-b border-black/50">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-white/90">
                        SPINE {style.numericSpine}
                      </span>
                      {isSaved && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                      )}
                    </div>

                    {/* Center Cover Graphic */}
                    <div className="relative my-auto p-3 text-center z-10">
                      <div className="w-6 h-px mx-auto mb-2 opacity-50" style={{ backgroundColor: style.palette.foil }} />
                      <h3
                        className="font-display font-bold text-xs sm:text-sm leading-snug line-clamp-3"
                        style={{ color: '#FAF7F0', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        {book.title}
                      </h3>
                      {book.author_name && (
                        <p
                          className="mt-1 text-[10px] font-serif uppercase tracking-wider truncate"
                          style={{ color: style.palette.foil }}
                        >
                          {book.author_name}
                        </p>
                      )}
                      <div className="w-6 h-px mx-auto mt-2 opacity-50" style={{ backgroundColor: style.palette.foil }} />
                    </div>

                    {/* Bottom Metadata Bar */}
                    <div className="w-full bg-black/40 px-2 py-1 flex items-center justify-between text-[9px] font-mono text-white/70 z-10 border-t border-white/10">
                      <span>{book.discussion_count} {book.discussion_count === 1 ? 'meetup' : 'meetups'}</span>
                      <span className="text-amber-300 group-hover:underline">Pull ↗</span>
                    </div>

                    {/* Specular sheen */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-25"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 65%)',
                      }}
                    />
                  </div>

                  {/* Caption */}
                  <div className="mt-2 px-0.5">
                    <span className="font-serif font-bold text-xs leading-tight text-[#14130F] line-clamp-1">
                      {book.title}
                    </span>
                    <span className="text-[11px] text-neutral-500 truncate block">
                      {book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : 'BBB'} · {book.author_name || 'Bangalore'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* =======================================================
          4. FILTER SHEET DRAWER
          ======================================================= */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsFilterSheetOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-sm h-full bg-[#14100D] border-l border-white/15 p-6 text-paper flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      BROWSE THE ARCHIVE
                    </span>
                    <h3 className="font-display text-xl font-bold text-white">
                      Filters
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* Discussions Facet */}
                <div className="mt-6">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block mb-2.5">
                    Discussions Volume
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { id: 'all', label: 'All Volumes' },
                      { id: 'popular', label: '3+ Discussions (Community Staples)' },
                      { id: 'two-plus', label: '2+ Discussions' },
                      { id: 'single', label: '1 Discussion' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setDiscussionFilter(f.id as any)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif transition-colors ${
                          discussionFilter === f.id
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alphabet A-Z Facet */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                      Alphabet Index
                    </span>
                    {selectedLetter && (
                      <button
                        onClick={() => setSelectedLetter(null)}
                        className="text-[10px] font-mono text-amber-300 hover:underline"
                      >
                        Clear letter
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                      <button
                        key={letter}
                        onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                        className={`py-1.5 rounded text-xs font-mono font-bold transition-colors ${
                          selectedLetter === letter
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/5 hover:bg-white/15 text-white/80'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sheet Actions */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => {
                    setDiscussionFilter('all')
                    setSelectedLetter(null)
                    setSearchQuery('')
                  }}
                  className="text-xs font-mono text-neutral-400 hover:text-white"
                >
                  Reset all
                </button>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="px-5 py-2 rounded-full bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-amber-100"
                >
                  Show {filteredBooks.length} Volumes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =======================================================
          5. 3D INSPECTION MODAL (Exact match with Recording 00:26)
          ======================================================= */}
      <AnimatePresence>
        {selectedBook && (
          <BookInspectionStage
            book={selectedBook}
            allBooks={filteredBooks}
            userPicks={userPicks}
            onTogglePick={handleTogglePick}
            onClose={() => setSelectedBook(null)}
            onSelectBook={(b) => setSelectedBook(b)}
          />
        )}
      </AnimatePresence>

      {/* =======================================================
          6. "YOUR CLOSET PICKS" TOTE BAG TRAY
          ======================================================= */}
      <AnimatePresence>
        {isPicksTrayOpen && (
          <PicksTray
            userPicks={userPicks}
            isOpen={isPicksTrayOpen}
            onClose={() => setIsPicksTrayOpen(false)}
            onSelectBook={(b) => setSelectedBook(b)}
            onRemovePick={handleRemovePick}
            onOpenPolaroid={() => setIsPolaroidOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* =======================================================
          7. VINTAGE POLAROID GENERATOR OVERLAY
          ======================================================= */}
      <AnimatePresence>
        {isPolaroidOpen && (
          <PolaroidModal
            userPicks={userPicks}
            isOpen={isPolaroidOpen}
            onClose={() => setIsPolaroidOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
