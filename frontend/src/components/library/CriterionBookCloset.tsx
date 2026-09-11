'use client'

import * as React from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { fetchBooks, type Book } from '@/lib/api'
import { formatDate } from '@/lib/utils'

// ============================================
// 1. Archival Folio Palettes & Spine Generators
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

  // Height variation: 168px to 215px
  const height = 168 + (absHash % 48)
  // Width variation: 26px to 44px
  const width = 26 + (absHash % 19)
  // Natural resting tilt: -1.2 to +1.2 degrees
  const tilt = ((absHash % 25) - 12) * 0.09

  return {
    palette,
    spineNo: `#${spineNumber.toString().padStart(3, '0')}`,
    height,
    width,
    tilt,
  }
}

// ============================================
// 2. Individual Spine Component
// ============================================

interface ClosetSpineProps {
  book: Book
  isSelected: boolean
  isDimmed: boolean
  isSaved: boolean
  onSelect: (book: Book) => void
  onHover: (book: Book | null) => void
}

const ClosetSpine = React.memo(function ClosetSpine({
  book,
  isSelected,
  isDimmed,
  isSaved,
  onSelect,
  onHover,
}: ClosetSpineProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const styleInfo = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])
  const { palette, spineNo, height, width, tilt } = styleInfo

  const springConfig = { stiffness: 320, damping: 24, mass: 0.6 }
  const y = useSpring(0, springConfig)
  const z = useSpring(0, springConfig)
  const rotateY = useSpring(0, springConfig)
  const rotateZ = useSpring(tilt, springConfig)
  const scale = useSpring(1, springConfig)

  React.useEffect(() => {
    if (isSelected) {
      y.set(-36)
      z.set(45)
      rotateY.set(-20)
      rotateZ.set(0)
      scale.set(1.08)
    } else if (isHovered) {
      y.set(-18)
      z.set(32)
      rotateY.set(-12)
      rotateZ.set(0)
      scale.set(1.04)
    } else {
      y.set(0)
      z.set(0)
      rotateY.set(0)
      rotateZ.set(tilt)
      scale.set(1)
    }
  }, [isHovered, isSelected, tilt, y, z, rotateY, rotateZ, scale])

  return (
    <div
      className={`relative select-none shrink-0 transition-opacity duration-300 transform-gpu cursor-pointer ${
        isDimmed ? 'opacity-20 grayscale-[80%]' : 'opacity-100'
      }`}
      style={{
        width,
        height: 220,
        display: 'flex',
        alignItems: 'flex-end',
        perspective: '1200px',
      }}
      onMouseEnter={() => {
        setIsHovered(true)
        onHover(book)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        onHover(null)
      }}
      onClick={() => onSelect(book)}
    >
      {/* Dynamic Contact Shadow on Shelf Plank */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/80 blur-[2px] pointer-events-none"
        animate={{
          width: isHovered || isSelected ? width * 1.2 : width * 0.85,
          height: isHovered || isSelected ? 8 : 4,
          opacity: isHovered || isSelected ? 0.8 : 0.45,
        }}
      />

      {/* 3D Physical Spine */}
      <motion.div
        className="relative rounded-t-[3px] rounded-b-[1px] overflow-hidden shadow-lg"
        style={{
          width,
          height,
          backgroundColor: palette.bg,
          transformStyle: 'preserve-3d',
          y,
          z,
          rotateY,
          rotateZ,
          scale,
          transformOrigin: 'bottom center',
          boxShadow: `
            inset 0 0 10px rgba(0,0,0,0.65),
            inset 1px 0 0 rgba(255,255,255,0.12),
            inset -1px 0 0 rgba(0,0,0,0.5),
            0 4px 12px rgba(0,0,0,0.5)
          `,
        }}
      >
        {/* Saved Stack Heart Badge */}
        {isSaved && (
          <div className="absolute top-1 right-1 z-20 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
        )}

        {/* Top Spine Headband & Number Box */}
        <div className="absolute top-0 inset-x-0 pt-1.5 pb-1 flex flex-col items-center border-b border-black/40 bg-black/20">
          <div className="w-full h-1 bg-amber-600/40 border-y border-white/20 mb-1" />
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

        {/* Vertical Title & Author in Spine */}
        <div
          className="absolute inset-x-0 top-9 bottom-7 flex flex-col items-center justify-between py-1 px-0.5"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span
            className="text-[9px] font-display font-semibold tracking-wide truncate max-h-[120px]"
            style={{
              color: palette.spineText,
              textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.2)',
            }}
          >
            {book.title}
          </span>

          {book.author_name && (
            <span
              className="text-[7.5px] font-serif uppercase tracking-widest truncate max-h-[70px] opacity-85"
              style={{ color: palette.foil }}
            >
              {book.author_name}
            </span>
          )}
        </div>

        {/* Bottom Spine Trim */}
        <div className="absolute bottom-0 inset-x-0 pb-1.5 pt-0.5 flex flex-col items-center border-t border-black/40 bg-black/25">
          <div className="w-full h-1 bg-amber-600/40 border-y border-white/20 mt-0.5" />
        </div>

        {/* Curved Spine Specular Sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, transparent 28%, rgba(255,255,255,0.16) 65%, rgba(0,0,0,0.35) 100%)',
          }}
        />
      </motion.div>
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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isSaved = userPicks.some((b) => b.id === book.id)
  const styleInfo = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])
  const { palette, spineNo } = styleInfo

  // Spring-smoothed mouse 3D rotation
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
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0) }}
    >
      {/* Background Depth-of-Field Blur Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#070504]/85 backdrop-blur-2xl"
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

      {/* Top Stack Indicator */}
      <div className="fixed top-5 inset-x-0 mx-auto w-fit z-40 pointer-events-auto">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl text-xs font-mono">
          <span className="text-amber-300 font-semibold tracking-wider uppercase text-[10px]">
            YOUR STACK
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={`dot-${i}`}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < userPicks.length ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

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

      {/* 3-Panel Inspection Layout: Left Record | Center 3D Book | Right Actions */}
      <div className="relative z-30 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 py-8 pointer-events-auto">

        {/* LEFT PANEL: Archival Record */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:w-80 bg-[#120F0D]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-paper flex flex-col justify-between order-2 lg:order-1 max-h-[520px] overflow-y-auto scrollbar-thin"
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

            {/* Picked by BBB Readers */}
            <div className="mt-4">
              <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase mb-2">
                PICKED BY BBB READERS
              </div>
              {book.members && book.members.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                  {book.members.map((member, idx) => (
                    <Link
                      key={`member-${member.id || idx}`}
                      href={`/members/${member.id}`}
                      className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-amber-950/70 border border-white/10 hover:border-amber-500/50 text-[11px] text-amber-200 hover:text-white transition-colors"
                    >
                      {member.display_name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">
                  Discussed and preserved in BBB community archives.
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
          initial={{ scale: 0.78, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.82, y: 30, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
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
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.25'%3E%3Cpath d='M0 0h4v4H0V0zm4 4h4v4H4V4z'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              {/* Gold Foil Filigree Border */}
              <div
                className="absolute inset-3.5 border rounded-sm pointer-events-none"
                style={{
                  borderColor: `${palette.foil}50`,
                  boxShadow: `inset 0 0 1px 1px ${palette.foil}30, 0 0 1px ${palette.foil}35`,
                }}
              />

              <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: palette.foil }} />
              <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: palette.foil }} />
              <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: palette.foil }} />
              <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: palette.foil }} />

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

          {/* Angle Mode Switcher */}
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
            Move mouse to turn · Click background to put it back
          </p>
        </motion.div>

        {/* RIGHT PANEL: Read It / Reading Stack / Meetups */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full lg:w-80 bg-[#120F0D]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-paper flex flex-col justify-between order-3 max-h-[520px] overflow-y-auto scrollbar-thin"
        >
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase mb-2">
              READ IT / ARCHIVAL RECORD
            </div>

            {/* Primary Action Button */}
            <Link
              href={`/books/${book.id}`}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 hover:bg-amber-100 hover:scale-[1.02] active:scale-[0.98] mb-3"
            >
              <span>Examine Full Record</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Add to Reading Stack */}
            <div className="my-4 pt-3 border-t border-white/10">
              <div className="text-[10px] font-mono tracking-widest text-white/50 uppercase mb-2">
                ADD TO YOUR READING STACK
              </div>

              <button
                onClick={() => onTogglePick(book)}
                className={`w-full py-2.5 px-4 rounded-xl border font-sans text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isSaved
                    ? 'bg-amber-600/90 border-amber-400/60 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/80 hover:text-white'
                }`}
              >
                <span>{isSaved ? '❤️ In Your Stack (Click to Remove)' : '+ Add to My Stack'}</span>
              </button>
            </div>

            {/* Meetup Discussions Mentioned */}
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

      {/* Bottom Floating Bar */}
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
// 4. "Your Stack / Pick Your Four" Modal
// ============================================

interface PicksModalProps {
  userPicks: Book[]
  isOpen: boolean
  onClose: () => void
  onSelectBook: (book: Book) => void
  onRemovePick: (bookId: string) => void
}

function PicksModal({
  userPicks,
  isOpen,
  onClose,
  onSelectBook,
  onRemovePick,
}: PicksModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="relative z-10 w-full max-w-xl bg-[#14100D]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center"
      >
        <div className="text-[10px] font-mono tracking-[0.25em] text-white/50 uppercase mb-2">
          YOUR CLOSET PICKS
        </div>
        <h3 className="font-display text-2xl font-bold text-white mb-2">
          Pick your four
        </h3>
        <p className="text-xs text-white/60 mb-6 font-serif">
          Curate your personal 4-volume reading stack from the BBB Archive shelves.
        </p>

        {/* 4 Polaroid Slots */}
        <div className="grid grid-cols-4 gap-3 my-4">
          {Array.from({ length: 4 }).map((_, idx) => {
            const book = userPicks[idx]
            if (book) {
              const styleInfo = getBookSpineStyle(book.title, book.id)
              return (
                <div
                  key={`pick-${book.id}`}
                  className="group relative h-36 rounded-xl border border-white/15 hover:border-amber-400/70 p-2.5 flex flex-col items-center justify-between cursor-pointer transition-all shadow-lg"
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
                className="h-36 rounded-xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center p-3 text-center text-white/30"
              >
                <span className="text-base mb-1.5">♡</span>
                <span className="text-[9px] font-mono">Empty Slot</span>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-amber-100"
          >
            Browse the Closet
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// 5. Master Criterion-Inspired Book Closet Component
// ============================================

export function CriterionBookCloset() {
  const searchParams = useSearchParams()
  const selectParam = searchParams.get('select')

  const [books, setBooks] = React.useState<Book[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null)
  const [hoveredBook, setHoveredBook] = React.useState<Book | null>(null)

  // Floating controls state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'most-discussed' | 'recent'>('all')
  const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false)
  const [userPicks, setUserPicks] = React.useState<Book[]>([])
  const [isPicksModalOpen, setIsPicksModalOpen] = React.useState(false)

  // Smooth mouse room tilt / panning
  const closetRef = React.useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { stiffness: 45, damping: 20, mass: 1 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const roomRotateY = useTransform(smoothX, [-0.5, 0.5], [-3.5, 3.5])
  const roomRotateX = useTransform(smoothY, [-0.5, 0.5], [2.5, -2.5])
  const roomTranslateX = useTransform(smoothX, [-0.5, 0.5], [-25, 25])

  // Fetch all books
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

  // Deep linking: ?select=<id>
  React.useEffect(() => {
    if (!selectParam || books.length === 0) return
    const target = books.find((b) => b.id === selectParam)
    if (target) {
      setSelectedBook(target)
    }
  }, [selectParam, books])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectedBook) return
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    mouseX.set(clientX / innerWidth - 0.5)
    mouseY.set(clientY / innerHeight - 0.5)
  }

  // Filter books
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

    if (activeFilter === 'most-discussed') {
      list = [...list].sort((a, b) => b.discussion_count - a.discussion_count)
    } else if (activeFilter === 'recent') {
      list = [...list].sort((a, b) => (b.first_discussed_date || '').localeCompare(a.first_discussed_date || ''))
    }

    return list
  }, [books, searchQuery, activeFilter])

  // Split books across 5 floor-to-ceiling shelf tiers
  const shelfRows = React.useMemo(() => {
    const rowsCount = 5
    const rows: Book[][] = Array.from({ length: rowsCount }, () => [])
    filteredBooks.forEach((book, idx) => {
      rows[idx % rowsCount].push(book)
    })
    return rows
  }, [filteredBooks])

  // Random Discovery action
  const handleRandomPick = () => {
    if (books.length === 0) return
    const randomIdx = Math.floor(Math.random() * books.length)
    const pick = books[randomIdx]
    if (pick) {
      setSelectedBook(pick)
    }
  }

  // Toggle user pick in stack
  const handleTogglePick = (book: Book) => {
    setUserPicks((prev) => {
      const exists = prev.some((b) => b.id === book.id)
      if (exists) {
        return prev.filter((b) => b.id !== book.id)
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), book]
      }
      return [...prev, book]
    })
  }

  const handleRemovePick = (bookId: string) => {
    setUserPicks((prev) => prev.filter((b) => b.id !== bookId))
  }

  return (
    <div
      ref={closetRef}
      className="relative w-screen min-h-screen bg-[#070504] text-paper overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      style={{ perspective: '1600px' }}
    >
      {/* Cinematic Dark Room Atmosphere & Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 70% at 50% 30%, rgba(245, 215, 150, 0.08) 0%, transparent 65%),
            linear-gradient(90deg, rgba(0,0,0,0.85) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.85) 100%)
          `,
        }}
      />

      {/* =======================================================
          TOP FLOATING PILL NAVBAR (Criterion Closet Style)
          ======================================================= */}
      <header className="fixed top-4 inset-x-0 mx-auto max-w-6xl px-4 z-40 flex items-center justify-between pointer-events-none">

        {/* Left Floating Action Group */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search Pill */}
          <div className="relative">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-wider flex items-center gap-2 backdrop-blur-xl transition-all shadow-lg ${
                isSearchOpen || searchQuery
                  ? 'bg-amber-600/90 border-amber-400 text-white'
                  : 'bg-black/60 border-white/15 text-white/80 hover:text-white hover:bg-black/80'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>{searchQuery ? `"${searchQuery}"` : 'Search'}</span>
            </button>

            {/* Search Input Dropdown */}
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute left-0 top-full mt-2 w-72 bg-[#120F0D]/95 border border-white/15 rounded-2xl p-2.5 shadow-2xl backdrop-blur-2xl z-50"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, number…"
                    autoFocus
                    className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[11px] font-mono text-white/50 px-1">
                      <span>{filteredBooks.length} results</span>
                      <button onClick={() => setSearchQuery('')} className="text-amber-400 hover:underline">
                        Clear
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters Pill */}
          <div className="relative">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-wider flex items-center gap-2 backdrop-blur-xl transition-all shadow-lg ${
                activeFilter !== 'all'
                  ? 'bg-amber-600/90 border-amber-400 text-white'
                  : 'bg-black/60 border-white/15 text-white/80 hover:text-white hover:bg-black/80'
              }`}
            >
              <span>⫘ Filters</span>
            </button>

            <AnimatePresence>
              {isFilterMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute left-0 top-full mt-2 w-48 bg-[#120F0D]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-1"
                >
                  {[
                    { id: 'all', label: 'All Volumes' },
                    { id: 'most-discussed', label: 'Most Discussed' },
                    { id: 'recent', label: 'Recent Reads' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setActiveFilter(f.id as any)
                        setIsFilterMenuOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-serif transition-colors ${
                        activeFilter === f.id ? 'bg-amber-600 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Random / Surprise Me Button */}
          <button
            onClick={handleRandomPick}
            className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/85 border border-white/15 text-white/80 hover:text-white text-xs font-mono tracking-wider flex items-center gap-1.5 backdrop-blur-xl transition-all shadow-lg hover:scale-105 active:scale-95"
            title="Randomly pick a volume from the shelves"
          >
            <span>🎲</span>
            <span className="hidden sm:inline">Random</span>
          </button>

          {/* Closet Picks / Reading Stack Modal Button */}
          <button
            onClick={() => setIsPicksModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-wider flex items-center gap-1.5 backdrop-blur-xl transition-all shadow-lg ${
              userPicks.length > 0
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 hover:bg-amber-900'
                : 'bg-black/60 border-white/15 text-white/80 hover:text-white hover:bg-black/80'
            }`}
          >
            <span>♡ Your Picks</span>
            {userPicks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-bold">
                {userPicks.length}/4
              </span>
            )}
          </button>
        </div>

        {/* Right View Switcher: List View | Closet View */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl shadow-lg pointer-events-auto">
          <Link
            href="/library"
            className="px-3 py-1 rounded-full text-xs font-mono text-white/60 hover:text-white transition-colors"
          >
            List View
          </Link>
          <button
            className="px-3 py-1 rounded-full bg-white text-black font-semibold text-xs font-mono shadow-sm"
          >
            Closet View
          </button>
        </div>
      </header>

      {/* =======================================================
          MAIN BOOKCASE WALL (Dense Floor-to-Ceiling Closet View)
          ======================================================= */}
      <main
        className="relative w-full h-screen flex items-center justify-center overflow-x-auto overflow-y-hidden pt-12 pb-16 transition-all duration-500 scrollbar-none"
        style={{
          filter: selectedBook ? 'blur(22px) brightness(0.25) contrast(0.95)' : 'none',
          pointerEvents: selectedBook ? 'none' : 'auto',
        }}
      >
        {loading ? (
          <div className="text-center space-y-3">
            <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-serif text-xs text-amber-200/60 uppercase tracking-widest">
              Walking into the BBB Book Closet…
            </p>
          </div>
        ) : (
          <motion.div
            className="flex flex-col justify-center space-y-4 px-8 min-w-max"
            style={{
              rotateY: roomRotateY,
              rotateX: roomRotateX,
              x: roomTranslateX,
              transformStyle: 'preserve-3d',
            }}
          >
            {shelfRows.map((rowBooks, rowIndex) => (
              <div key={`shelf-row-${rowIndex}`} className="relative flex flex-col">
                {/* Book Spines Row */}
                <div className="flex items-end px-6 space-x-[1px]">
                  {rowBooks.map((book) => (
                    <ClosetSpine
                      key={book.id}
                      book={book}
                      isSelected={selectedBook?.id === book.id}
                      isDimmed={false}
                      isSaved={userPicks.some((b) => b.id === book.id)}
                      onSelect={(b) => setSelectedBook(b)}
                      onHover={(b) => setHoveredBook(b)}
                    />
                  ))}
                </div>

                {/* Dark Solid Walnut Wood Shelf Board with Gilded Trim */}
                <div className="relative h-5 -mt-0.5 mx-2 z-10">
                  <div
                    className="absolute inset-x-0 h-full rounded-b-sm overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, #4A3220 0%, #342214 40%, #20140A 100%)',
                      boxShadow: '0 8px 18px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  />
                  {/* Brass front lip */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-[2px]"
                    style={{
                      background: 'linear-gradient(90deg, #785526 0%, #C99E52 50%, #785526 100%)',
                    }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </main>

      {/* =======================================================
          FLOATING BOTTOM ARCHIVAL BADGE (Criterion Closet Style)
          ======================================================= */}
      {!selectedBook && (
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-5 inset-x-0 mx-auto w-fit z-40 pointer-events-none"
        >
          <div className="bg-[#120F0D]/90 border border-white/15 rounded-full px-5 py-2 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center gap-4 text-xs pointer-events-auto">
            {hoveredBook ? (
              (() => {
                const styleInfo = getBookSpineStyle(hoveredBook.title, hoveredBook.id)
                return (
                  <>
                    <span className="font-mono text-amber-400 font-bold">{styleInfo.spineNo}</span>
                    <span className="h-3 w-px bg-white/20" />
                    <span className="font-serif font-semibold text-white max-w-[200px] sm:max-w-[320px] truncate">
                      {hoveredBook.title}
                    </span>
                    {hoveredBook.author_name && (
                      <>
                        <span className="h-3 w-px bg-white/20 hidden sm:inline" />
                        <span className="text-white/60 hidden sm:inline truncate max-w-[160px]">
                          {hoveredBook.author_name}
                        </span>
                      </>
                    )}
                    <span className="h-3 w-px bg-white/20" />
                    <span className="text-[10px] font-mono text-amber-300">
                      {hoveredBook.discussion_count} {hoveredBook.discussion_count === 1 ? 'meetup' : 'meetups'}
                    </span>
                    <span className="hidden md:inline text-[10px] font-serif text-white/40 italic">
                      · Click to pull
                    </span>
                  </>
                )
              })()
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                <span className="font-mono text-[11px] text-white/70 uppercase tracking-widest">
                  BBB Digital Closet · {books.length} Volumes · Bangalore
                </span>
                <span className="hidden sm:inline text-white/30">|</span>
                <span className="hidden sm:inline font-serif text-[11px] text-white/50 italic">
                  Hover to examine · Click to pull from shelf
                </span>
              </>
            )}
          </div>
        </motion.footer>
      )}

      {/* =======================================================
          INDIVIDUAL BOOK 3D INSPECTION VIEW (Criterion Closet 1:1)
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
          "PICK YOUR FOUR / YOUR BBB STACK" MODAL
          ======================================================= */}
      <AnimatePresence>
        {isPicksModalOpen && (
          <PicksModal
            userPicks={userPicks}
            isOpen={isPicksModalOpen}
            onClose={() => setIsPicksModalOpen(false)}
            onSelectBook={(b) => setSelectedBook(b)}
            onRemovePick={handleRemovePick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
