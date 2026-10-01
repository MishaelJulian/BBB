'use client'

import * as React from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { fetchBooks, type Book } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { CriterionDetailModal } from './CriterionDetailModal'
import { CriterionListDetailModal } from './CriterionListDetailModal'

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

export function pseudoShuffle<T>(array: T[], seed: number = 1): T[] {
  const arr = [...array]
  let m = arr.length
  let t: T
  let i: number
  let s = seed
  while (m) {
    s = (s * 9301 + 49297) % 233280
    const rnd = s / 233280
    i = Math.floor(rnd * m--)
    t = arr[m]
    arr[m] = arr[i]
    arr[i] = t
  }
  return arr
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
// 3. Individual Shelf Wall Component (5 Rows per Wall)
// ============================================

interface ShelfWallProps {
  wallName: string
  shelfNumber: number
  rows: Book[][]
  selectedBookId?: string
  hoveredBookId?: string
  userPicks: Book[]
  onSelectBook: (book: Book) => void
  onHoverBook: (book: Book | null) => void
}

const ShelfWall = React.memo(function ShelfWall({
  wallName,
  shelfNumber,
  rows,
  selectedBookId,
  hoveredBookId,
  userPicks,
  onSelectBook,
  onHoverBook,
}: ShelfWallProps) {
  const totalBooksOnWall = rows.reduce((acc, r) => acc + r.length, 0)

  return (
    <div className="flex flex-col justify-center gap-2 select-none">
      {/* Brass Plaque Archival Header at top of each shelf wall */}
      <div className="flex items-center justify-between px-4 pb-1 border-b border-amber-500/30 bg-gradient-to-r from-black/60 via-amber-950/30 to-black/60 rounded-t backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          <span className="font-mono text-[10.5px] tracking-[0.25em] text-amber-200 font-bold uppercase">
            SHELF {shelfNumber} · {wallName}
          </span>
        </div>
        <span className="font-mono text-[9px] tracking-widest text-white/50 uppercase">
          {totalBooksOnWall} Volumes
        </span>
      </div>

      {/* 5 Shelf Rows (Tiers 0–4) */}
      {rows.map((rowBooks, rIdx) => (
        <div key={`shelf-${shelfNumber}-row-${rIdx}`} className="relative flex flex-col">
          {/* Spines on Row (Sitting closely touching on the shelf plank) */}
          <div className="flex items-end px-2 space-x-[1px] min-h-[220px] overflow-hidden">
            {rowBooks.map((book) => (
              <ClosetSpine
                key={`b-${book.id}`}
                book={book}
                isSelected={selectedBookId === book.id}
                isHoveredByReticle={hoveredBookId === book.id}
                isSaved={userPicks.some((b) => b.id === book.id)}
                onSelect={onSelectBook}
                onHover={onHoverBook}
              />
            ))}
            {rowBooks.length === 0 && (
              <div className="h-10 flex items-center px-4 text-[10px] font-mono text-white/25 italic">
                Empty shelf tier
              </div>
            )}
          </div>

          {/* Wooden Shelf Plank with Beveled Brass Front Edge Trim */}
          <div className="relative h-4 -mt-0.5 mx-0.5 z-10 pointer-events-none">
            <div
              className="absolute inset-x-0 h-full rounded-b-sm overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #3A2416 0%, #22140A 60%, #100804 100%)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.14)',
              }}
            />
            {/* Polished brass lip */}
            <div
              className="absolute inset-x-0 bottom-0 h-[2px]"
              style={{
                background: 'linear-gradient(90deg, #785526 0%, #F5CE7A 50%, #785526 100%)',
                boxShadow: '0 0 5px rgba(245,206,122,0.6)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
})

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
  const meetupParam = searchParams.get('meetup')

  // View Mode: 'closet' | 'list'
  const [viewMode, setViewMode] = React.useState<'closet' | 'list'>('closet')

  const [books, setBooks] = React.useState<Book[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null)
  const [hoveredBook, setHoveredBook] = React.useState<Book | null>(null)

  // Desktop Green circular reticle cursor motion values (Zero React re-renders)
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)

  // Floating controls & filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isSearchFocused, setIsSearchFocused] = React.useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [discussionFilter, setDiscussionFilter] = React.useState<'all' | 'popular' | 'two-plus' | 'single'>('all')
  const [selectedLetter, setSelectedLetter] = React.useState<string | null>(null)
  const [selectedMeetup, setSelectedMeetup] = React.useState<number | null>(
    meetupParam && !isNaN(Number(meetupParam)) ? Number(meetupParam) : null
  )
  const [sortBy, setSortBy] = React.useState<'latest' | 'random' | 'spine-asc' | 'spine-desc' | 'title-asc' | 'discussions-desc'>('latest')
  const [shuffleSeed, setShuffleSeed] = React.useState(1)
  const [shelfSection, setShelfSection] = React.useState(0)

  // Tote Bag / User Picks (4 volumes max)
  const [userPicks, setUserPicks] = React.useState<Book[]>([])
  const [isPicksTrayOpen, setIsPicksTrayOpen] = React.useState(false)
  const [isPolaroidOpen, setIsPolaroidOpen] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Available Meetups extracted dynamically from loaded archive
  const availableMeetups = React.useMemo(() => {
    const map = new Map<number, { number: number; count: number; date?: string | null; venue?: string | null }>()
    books.forEach((b) => {
      (b.meetups || []).forEach((m) => {
        if (m.number) {
          const existing = map.get(m.number) || { number: m.number, count: 0, date: m.date, venue: m.venue }
          existing.count += 1
          map.set(m.number, existing)
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.number - a.number)
  }, [books])

  // Mobile responsiveness & viewport tracking
  const [isMobile, setIsMobile] = React.useState(false)
  const [windowWidth, setWindowWidth] = React.useState(1200)

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setWindowWidth(window.innerWidth)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Camera yaw & pitch for 3D Walk-in Corner Closet (Desktop Mouse + Mobile Touch Drag)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { stiffness: 45, damping: 20, mass: 1 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // Touch Drag Motion Values for Mobile 3D Room Navigation
  const touchYawMotion = useMotionValue(0)
  const touchPitchMotion = useMotionValue(0)
  const smoothTouchYaw = useSpring(touchYawMotion, { stiffness: 50, damping: 18 })
  const smoothTouchPitch = useSpring(touchPitchMotion, { stiffness: 50, damping: 18 })
  const touchStartRef = React.useRef({ x: 0, y: 0, startYaw: 0, startPitch: 0 })
  const [currentWallIndex, setCurrentWallIndex] = React.useState<0 | 1 | 2>(1) // 0: Left (+38°), 1: Main (0°), 2: Right (-38°)

  // Unified camera rotation combining desktop mouse parallax and mobile touch pan
  const camRotateY = useTransform(
    [smoothX, smoothTouchYaw],
    ([mx, ty]: any[]) => ((mx as number) * 36) + (ty as number)
  )
  const camRotateX = useTransform(
    [smoothY, smoothTouchPitch],
    ([my, tp]: any[]) => (-(my as number) * 20) + (tp as number)
  )

  const snapToWall = (wallIdx: 0 | 1 | 2) => {
    setCurrentWallIndex(wallIdx)
    const targetYaws = [38, 0, -38] // Left wall +38°, Center 0°, Right -38°
    touchYawMotion.set(targetYaws[wallIdx])
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectedBook || e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startYaw: touchYawMotion.get(),
      startPitch: touchPitchMotion.get(),
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (selectedBook || e.touches.length !== 1) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    // Swipe right pans towards Left Wing (+), swipe left pans towards Right Wing (-)
    const newYaw = Math.max(-48, Math.min(48, touchStartRef.current.startYaw + dx * 0.22))
    const newPitch = Math.max(-14, Math.min(14, touchStartRef.current.startPitch - dy * 0.1))
    touchYawMotion.set(newYaw)
    touchPitchMotion.set(newPitch)
  }

  const handleTouchEnd = () => {
    const yaw = touchYawMotion.get()
    if (yaw > 18) setCurrentWallIndex(0)
    else if (yaw < -18) setCurrentWallIndex(2)
    else setCurrentWallIndex(1)
  }

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

  // Fetch books (only keep books discussed in the database, exclude general discussion and tangents)
  const loadBooks = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await fetchBooks({
        limit: 3000,
        onlyDiscussed: true,
        excludeGeneral: true,
      })
      const discussedBooks = (data || []).filter((b) => {
        const hasDiscussions = Boolean(b.discussion_count && b.discussion_count > 0) || Boolean(b.meetups && b.meetups.length > 0)
        const isNotGeneral = !b.is_general_discussion
        const isNotTangent = b.media_type !== 'tangent' && !b.title?.toLowerCase().includes('(tangent)')
        return hasDiscussions && isNotGeneral && isNotTangent
      })
      setBooks(discussedBooks)
    } catch (err) {
      console.error('Failed to load books for closet:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadBooks()
  }, [loadBooks])

  // Reset to first shelves when filters or sort change
  React.useEffect(() => {
    setShelfSection(0)
  }, [searchQuery, discussionFilter, selectedLetter, selectedMeetup, sortBy])

  const handleSyncDatabase = async () => {
    setIsSyncing(true)
    try {
      await loadBooks(true)
      showToast(`Archive synced with database (${books.length.toLocaleString()} volumes)`)
    } catch {
      showToast('Failed to sync database')
    } finally {
      setIsSyncing(false)
    }
  }

  // Deep linking ?select=<id>
  React.useEffect(() => {
    if (!selectParam || books.length === 0) return
    const target = books.find((b) => b.id === selectParam)
    if (target) setSelectedBook(target)
  }, [selectParam, books])

  // Deep linking ?meetup=<num>
  React.useEffect(() => {
    if (meetupParam && !isNaN(Number(meetupParam))) {
      setSelectedMeetup(Number(meetupParam))
    }
  }, [meetupParam])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (selectedBook) return // modal handles its own arrows

      if (e.key === 'ArrowRight' || e.key === ']' || e.key === 'PageDown') {
        if (viewMode === 'closet') {
          setShelfSection((prev) => prev + 1)
        }
      } else if (e.key === 'ArrowLeft' || e.key === '[' || e.key === 'PageUp') {
        if (viewMode === 'closet') {
          setShelfSection((prev) => Math.max(0, prev - 1))
        }
      }

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
  }, [userPicks, books, selectedBook, viewMode])

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
    if (isMobile) return
    const { clientX, clientY } = e
    cursorX.set(clientX)
    cursorY.set(clientY)
    if (selectedBook) return
    const { innerWidth, innerHeight } = window
    mouseX.set(clientX / innerWidth - 0.5)
    mouseY.set(clientY / innerHeight - 0.5)
  }

  // Filtered & Sorted Books (strictly discussed books, omitting general discussion / tangents)
  const filteredBooks = React.useMemo(() => {
    let list = books.filter((b) => {
      const hasDiscussions = Boolean(b.discussion_count && b.discussion_count > 0) || Boolean(b.meetups && b.meetups.length > 0)
      const isNotGeneral = !b.is_general_discussion
      const isNotTangent = b.media_type !== 'tangent' && !b.title?.toLowerCase().includes('(tangent)')
      return hasDiscussions && isNotGeneral && isNotTangent
    })

    // Meetup filter
    if (selectedMeetup !== null) {
      list = list.filter((b) => (b.meetups || []).some((m) => m.number === selectedMeetup))
    }

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      // Check if query is looking for a meetup, e.g. "meetup 45", "m45", "#45", or numeric "45"
      const meetupMatch = query.match(/(?:meetup\s*#?|m\s*#?|#)(\d+)/)
      const queryMeetupNum = meetupMatch ? parseInt(meetupMatch[1], 10) : null

      list = list.filter((b) => {
        const titleMatch = b.title.toLowerCase().includes(query)
        const authorMatch = (b.author_name || '').toLowerCase().includes(query)
        const spineMatch = getBookSpineStyle(b.title, b.id).numericSpine.toString() === query.replace(/[^0-9]/g, '')
        const meetupNumMatch = queryMeetupNum !== null 
          ? (b.meetups || []).some((m) => m.number === queryMeetupNum)
          : false
        return titleMatch || authorMatch || spineMatch || meetupNumMatch
      })
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

    if (sortBy === 'random') {
      return pseudoShuffle(list, shuffleSeed)
    } else if (sortBy === 'title-asc') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'discussions-desc') {
      list.sort((a, b) => b.discussion_count - a.discussion_count)
    } else if (sortBy === 'spine-desc') {
      list.sort((a, b) => {
        const spineA = getBookSpineStyle(a.title, a.id).numericSpine
        const spineB = getBookSpineStyle(b.title, b.id).numericSpine
        return spineB - spineA
      })
    } else if (sortBy === 'spine-asc') {
      list.sort((a, b) => {
        const spineA = getBookSpineStyle(a.title, a.id).numericSpine
        const spineB = getBookSpineStyle(b.title, b.id).numericSpine
        return spineA - spineB
      })
    } else {
      // DEFAULT: 'latest' (latest meetup number descending, then newest date descending)
      list.sort((a, b) => {
        const maxMeetupA = Math.max(0, ...(a.meetups || []).map((m) => m.number || 0))
        const maxMeetupB = Math.max(0, ...(b.meetups || []).map((m) => m.number || 0))
        if (maxMeetupB !== maxMeetupA) return maxMeetupB - maxMeetupA

        const dateA = a.last_discussed_date || a.first_discussed_date || ''
        const dateB = b.last_discussed_date || b.first_discussed_date || ''
        if (dateA && dateB && dateA !== dateB) return dateB.localeCompare(dateA)
        if (dateB && !dateA) return 1
        if (dateA && !dateB) return -1

        if ((b.discussion_count || 0) !== (a.discussion_count || 0)) {
          return (b.discussion_count || 0) - (a.discussion_count || 0)
        }
        return a.title.localeCompare(b.title)
      })
    }

    return list
  }, [books, selectedMeetup, searchQuery, discussionFilter, selectedLetter, sortBy, shuffleSeed])

  // =======================================================
  // 3-WALL SHELVING LAYOUT CALCULATIONS (Matching User Drawing 2 & 3)
  // Flow: Shelf 1 (Left Wall, Rows 0-4 top-to-bottom, left-to-right) ->
  //       Shelf 2 (Center Wall, Rows 0-4) ->
  //       Shelf 3 (Right Wall, Rows 0-4) ->
  //       Next Shelves Section (Shelves 4-6, 7-9, etc.)
  // =======================================================
  const BOOKS_PER_ROW = 18
  const ROWS_PER_SHELF = 5
  const BOOKS_PER_SHELF = BOOKS_PER_ROW * ROWS_PER_SHELF // 90
  const SHELVES_PER_SECTION = 3
  const BOOKS_PER_SECTION = BOOKS_PER_SHELF * SHELVES_PER_SECTION // 270

  const totalSections = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_SECTION))
  const safeSection = Math.min(shelfSection, totalSections - 1)

  const { shelf1Rows, shelf2Rows, shelf3Rows, currentShelfStartNumber, sectionInfo } = React.useMemo(() => {
    const startIndex = safeSection * BOOKS_PER_SECTION
    const currentSectionBooks = filteredBooks.slice(startIndex, startIndex + BOOKS_PER_SECTION)

    // Shelf 1 (Left Wall): first 90 books of this section
    const s1Books = currentSectionBooks.slice(0, BOOKS_PER_SHELF)
    // Shelf 2 (Center Wall): next 90 books
    const s2Books = currentSectionBooks.slice(BOOKS_PER_SHELF, BOOKS_PER_SHELF * 2)
    // Shelf 3 (Right Wall): next 90 books
    const s3Books = currentSectionBooks.slice(BOOKS_PER_SHELF * 2, BOOKS_PER_SHELF * 3)

    // Sequential row-by-row distribution: top row (0) fills left-to-right, then row 1, etc.
    const s1Rows: Book[][] = Array.from({ length: ROWS_PER_SHELF }, (_, r) =>
      s1Books.slice(r * BOOKS_PER_ROW, (r + 1) * BOOKS_PER_ROW)
    )
    const s2Rows: Book[][] = Array.from({ length: ROWS_PER_SHELF }, (_, r) =>
      s2Books.slice(r * BOOKS_PER_ROW, (r + 1) * BOOKS_PER_ROW)
    )
    const s3Rows: Book[][] = Array.from({ length: ROWS_PER_SHELF }, (_, r) =>
      s3Books.slice(r * BOOKS_PER_ROW, (r + 1) * BOOKS_PER_ROW)
    )

    const shelfStartNum = safeSection * SHELVES_PER_SECTION + 1 // e.g. 1, 4, 7...
    const meetups = currentSectionBooks
      .flatMap((b) => (b.meetups || []).map((m) => m.number).filter(Boolean))
    const maxM = meetups.length > 0 ? Math.max(...meetups) : null
    const minM = meetups.length > 0 ? Math.min(...meetups) : null

    return {
      shelf1Rows: s1Rows,
      shelf2Rows: s2Rows,
      shelf3Rows: s3Rows,
      currentShelfStartNumber: shelfStartNum,
      sectionInfo: {
        totalInCurrent: currentSectionBooks.length,
        maxMeetup: maxM,
        minMeetup: minM,
      },
    }
  }, [filteredBooks, safeSection])

  const searchSuggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return []
    return filteredBooks.slice(0, 6)
  }, [filteredBooks, searchQuery])

  const activeFiltersCount = (discussionFilter !== 'all' ? 1 : 0) + (selectedLetter ? 1 : 0) + (selectedMeetup !== null ? 1 : 0)

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

      {/* GREEN RETICLE CURSOR (Desktop only, driven by MotionValues with zero React re-renders) */}
      {viewMode === 'closet' && !selectedBook && !isMobile && (
        <motion.div
          className="fixed pointer-events-none z-50 hidden md:block"
          style={{
            x: cursorX,
            y: cursorY,
            translateX: '-50%',
            translateY: '-50%',
          }}
        >
          <div className="w-5 h-5 rounded-full border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-emerald-300" />
          </div>
        </motion.div>
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
            <button
              onClick={handleSyncDatabase}
              disabled={isSyncing}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                viewMode === 'closet'
                  ? 'bg-black/50 border-white/15 text-white/80 hover:text-white hover:border-amber-400'
                  : 'bg-white border-[#DDD6C7] text-neutral-700 hover:text-black'
              }`}
              title="Sync latest changes directly from database"
            >
              <svg
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'opacity-70'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isSyncing ? 'Syncing…' : 'Sync DB'}</span>
            </button>

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
          2. VIEW MODE A: 3-WALL 3D WALK-IN CLOSET (Matching MS Paint Drawings 2 & 3)
          ======================================================= */}
      {viewMode === 'closet' && (
        <main
          className="relative w-full h-[calc(100vh-64px)] overflow-hidden flex items-center justify-center select-none"
          style={{
            perspective: isMobile ? '950px' : '1150px',
            touchAction: 'pan-x pan-y',
            overscrollBehavior: 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Ambient Lighting & Room Vignette */}
          <div
            className="fixed inset-0 pointer-events-none z-0 opacity-60"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 70% 50% at 50% 40%, rgba(245, 215, 150, 0.14) 0%, transparent 65%),
                radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.88) 100%)
              `,
            }}
          />

          {/* SHELF SECTION NAVIGATION CONTROLS (Paging across 3-wall rooms) */}
          <div className="fixed top-16 z-30 inset-x-0 mx-auto w-fit max-w-[94vw] flex items-center justify-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 rounded-full bg-black/85 border border-white/20 shadow-2xl backdrop-blur-xl text-[10px] sm:text-xs font-mono">
            {/* Prev Shelves Button */}
            <button
              onClick={() => setShelfSection((s) => Math.max(0, s - 1))}
              disabled={safeSection === 0}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white font-semibold transition"
              title="Previous Shelves (Left Arrow or [)"
            >
              <span>◀</span>
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Shelf & Meetup Range Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 text-center">
              <span className="font-bold text-amber-300">
                Shelves {currentShelfStartNumber}–{currentShelfStartNumber + 2}
              </span>
              <span className="text-white/40 hidden xs:inline">of {totalSections * 3}</span>
              {sectionInfo.maxMeetup !== null && (
                <span className="hidden md:inline px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30">
                  {sectionInfo.maxMeetup === sectionInfo.minMeetup
                    ? `Meetup #${sectionInfo.maxMeetup}`
                    : `Meetups #${sectionInfo.maxMeetup}–#${sectionInfo.minMeetup}`}
                </span>
              )}
            </div>

            {/* Next Shelves Button */}
            <button
              onClick={() => setShelfSection((s) => Math.min(totalSections - 1, s + 1))}
              disabled={safeSection >= totalSections - 1}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white font-semibold transition"
              title="Next Shelves (Right Arrow or ])"
            >
              <span className="hidden sm:inline">Next</span>
              <span>▶</span>
            </button>

            {/* Direct Shelf Section Jump Dropdown */}
            {totalSections > 1 && (
              <div className="relative border-l border-white/20 pl-1.5 sm:pl-2">
                <select
                  value={safeSection}
                  onChange={(e) => setShelfSection(Number(e.target.value))}
                  className="bg-transparent text-amber-300 font-mono text-[10px] sm:text-[11px] appearance-none cursor-pointer focus:outline-none pr-3 sm:pr-4"
                >
                  {Array.from({ length: totalSections }).map((_, idx) => {
                    const startShelf = idx * 3 + 1
                    const endShelf = startShelf + 2
                    return (
                      <option key={idx} value={idx} className="bg-[#14100D] text-white">
                        {startShelf}–{endShelf} {idx === 0 ? '(Latest)' : ''}
                      </option>
                    )
                  })}
                </select>
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[7px] text-amber-300">▼</span>
              </div>
            )}
          </div>

          {/* Wall Perspective Quick Switcher (Touch Friendly & Responsive) */}
          <div className="fixed top-28 z-30 inset-x-0 mx-auto w-fit max-w-[94vw] flex items-center gap-1 p-1 rounded-full bg-black/85 border border-white/20 shadow-2xl backdrop-blur-xl text-[10px] sm:text-xs font-mono">
            <button
              onClick={() => snapToWall(0)}
              className={`px-2.5 sm:px-3.5 py-1 rounded-full transition-all ${
                currentWallIndex === 0
                  ? 'bg-amber-400 text-black font-bold shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              ◂ Left Wing ({currentShelfStartNumber})
            </button>
            <button
              onClick={() => snapToWall(1)}
              className={`px-2.5 sm:px-3.5 py-1 rounded-full transition-all ${
                currentWallIndex === 1
                  ? 'bg-amber-400 text-black font-bold shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Main ({currentShelfStartNumber + 1})
            </button>
            <button
              onClick={() => snapToWall(2)}
              className={`px-2.5 sm:px-3.5 py-1 rounded-full transition-all ${
                currentWallIndex === 2
                  ? 'bg-amber-400 text-black font-bold shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Right Wing ({currentShelfStartNumber + 2}) ▸
            </button>
          </div>

          {/* Active Meetup Shelving Badge (if single meetup filter selected) */}
          {selectedMeetup !== null && (
            <div className="fixed top-40 z-30 inset-x-0 mx-auto w-fit flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500 text-black font-mono text-xs font-bold shadow-2xl backdrop-blur-xl">
              <span>Shelving Meetup #{selectedMeetup} ({filteredBooks.length} volumes)</span>
              <button
                onClick={() => setSelectedMeetup(null)}
                className="w-4 h-4 rounded-full bg-black/20 hover:bg-black/40 text-black flex items-center justify-center text-[10px]"
                title="Show all volumes"
              >
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center space-y-3 z-10">
              <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-serif text-xs text-amber-200/60 uppercase tracking-widest">
                Shelving the collection…
              </p>
            </div>
          ) : (
            /* 3D CAMERA RIG (Swivels with mouse parallax on desktop & touch drag on mobile) */
            <motion.div
              className="absolute top-1/2 left-1/2 w-0 h-0"
              style={{
                transformStyle: 'preserve-3d',
                rotateY: camRotateY,
                rotateX: camRotateX,
                translateZ: isMobile ? -310 : -320,
                translateY: isMobile ? -10 : -20,
                scale: isMobile ? 0.90 : 1,
              }}
            >
              {/* FLOOR PLANE (Polished library dark walnut parquet) */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: '2600px',
                  height: '1800px',
                  left: '-1300px',
                  top: '620px',
                  transform: 'rotateX(90deg)',
                  transformOrigin: 'top center',
                  background: 'radial-gradient(ellipse 60% 50% at 50% 25%, #18110B 0%, #080503 70%, #000 100%)',
                  boxShadow: 'inset 0 0 120px rgba(0,0,0,0.95)',
                }}
              />

              {/* CEILING SPOTLIGHT PLANE */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: '2600px',
                  height: '1800px',
                  left: '-1300px',
                  bottom: '660px',
                  transform: 'rotateX(-90deg)',
                  transformOrigin: 'bottom center',
                  background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(250, 220, 160, 0.12) 0%, transparent 70%)',
                }}
              />

              {/* ========================================================
                  WALL 1: LEFT SHELVING WALL (Shelf 3*section + 1)
                  Angled at +38deg, right edge touches Left Divider Pillar
                  ======================================================== */}
              <div
                className="absolute top-[-600px] flex flex-col justify-center"
                style={{
                  width: '720px',
                  right: '360px',
                  transformOrigin: 'right center',
                  transform: 'translateZ(-360px) rotateY(38deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <ShelfWall
                  wallName="LEFT WING"
                  shelfNumber={currentShelfStartNumber}
                  rows={shelf1Rows}
                  selectedBookId={selectedBook?.id}
                  hoveredBookId={hoveredBook?.id}
                  userPicks={userPicks}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onHoverBook={(b) => setHoveredBook(b)}
                />
              </div>

              {/* LEFT DIVIDER PILLAR (Between Wall 1 and Wall 2) */}
              <div
                className="absolute top-[-620px] pointer-events-none z-20"
                style={{
                  width: '32px',
                  height: '1280px',
                  left: '-376px',
                  transform: 'translateZ(-355px)',
                  background: 'linear-gradient(90deg, #180F07 0%, #352010 35%, #4C2D16 50%, #201309 80%, #120A04 100%)',
                  boxShadow: '-8px 0 24px rgba(0,0,0,0.9), 8px 0 24px rgba(0,0,0,0.9)',
                  borderLeft: '1px solid rgba(201,158,82,0.3)',
                  borderRight: '1px solid rgba(201,158,82,0.3)',
                }}
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-amber-600/30 via-amber-400/50 to-amber-700/30" />
              </div>

              {/* ========================================================
                  WALL 2: CENTER SHELVING WALL (Shelf 3*section + 2)
                  Facing flat at rotateY(0deg)
                  ======================================================== */}
              <div
                className="absolute top-[-600px] left-1/2 flex flex-col justify-center"
                style={{
                  width: '720px',
                  transform: 'translateX(-50%) translateZ(-360px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <ShelfWall
                  wallName="MAIN GALLERY"
                  shelfNumber={currentShelfStartNumber + 1}
                  rows={shelf2Rows}
                  selectedBookId={selectedBook?.id}
                  hoveredBookId={hoveredBook?.id}
                  userPicks={userPicks}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onHoverBook={(b) => setHoveredBook(b)}
                />
              </div>

              {/* RIGHT DIVIDER PILLAR (Between Wall 2 and Wall 3) */}
              <div
                className="absolute top-[-620px] pointer-events-none z-20"
                style={{
                  width: '32px',
                  height: '1280px',
                  left: '344px',
                  transform: 'translateZ(-355px)',
                  background: 'linear-gradient(90deg, #180F07 0%, #352010 35%, #4C2D16 50%, #201309 80%, #120A04 100%)',
                  boxShadow: '-8px 0 24px rgba(0,0,0,0.9), 8px 0 24px rgba(0,0,0,0.9)',
                  borderLeft: '1px solid rgba(201,158,82,0.3)',
                  borderRight: '1px solid rgba(201,158,82,0.3)',
                }}
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-amber-600/30 via-amber-400/50 to-amber-700/30" />
              </div>

              {/* ========================================================
                  WALL 3: RIGHT SHELVING WALL (Shelf 3*section + 3)
                  Angled at -38deg, left edge touches Right Divider Pillar
                  ======================================================== */}
              <div
                className="absolute top-[-600px] flex flex-col justify-center"
                style={{
                  width: '720px',
                  left: '360px',
                  transformOrigin: 'left center',
                  transform: 'translateZ(-360px) rotateY(-38deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <ShelfWall
                  wallName="RIGHT WING"
                  shelfNumber={currentShelfStartNumber + 2}
                  rows={shelf3Rows}
                  selectedBookId={selectedBook?.id}
                  hoveredBookId={hoveredBook?.id}
                  userPicks={userPicks}
                  onSelectBook={(b) => setSelectedBook(b)}
                  onHoverBook={(b) => setHoveredBook(b)}
                />
              </div>
            </motion.div>
          )}

          {/* Floating Left Stack Toolbar */}
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

          {/* Floating Bottom-Left Hovered Case Card */}
          <div className="fixed bottom-6 left-6 z-40 pointer-events-none">
            {hoveredBook && !selectedBook && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#120F0D]/95 border border-white/15 rounded-xl p-3.5 shadow-2xl backdrop-blur-xl text-left max-w-xs pointer-events-auto"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-mono text-amber-400 font-bold block">
                    {getBookSpineStyle(hoveredBook.title, hoveredBook.id).spineNo}
                  </span>
                  {hoveredBook.meetups && hoveredBook.meetups.length > 0 && (
                    <span className="text-[10px] font-mono font-medium text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/25">
                      Meetup #{hoveredBook.meetups.map((m) => m.number).join(', #')}
                    </span>
                  )}
                </div>
                <h4 className="font-display text-sm font-bold text-white line-clamp-1 leading-snug">
                  {hoveredBook.title}
                </h4>
                <p className="text-[11px] text-white/60 font-serif line-clamp-1 mt-0.5">
                  {hoveredBook.author_name || 'BBB Archive'} {hoveredBook.first_discussed_date ? `· ${new Date(hoveredBook.first_discussed_date).getFullYear()}` : ''} {hoveredBook.meetups?.[0]?.venue ? `· ${hoveredBook.meetups[0].venue}` : ''}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-[9.5px] font-mono text-emerald-400 block">
                    ● Click to pull from shelf
                  </span>
                  <span className="text-[9.5px] font-mono text-neutral-400">
                    {hoveredBook.discussion_count} {hoveredBook.discussion_count === 1 ? 'discussion' : 'discussions'}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      )}

      {/* =======================================================
          3. VIEW MODE B: LIST VIEW / THE CRITERION WALL (Exact Criterion Layout)
          ======================================================= */}
      {viewMode === 'list' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#14130F]">
          {/* Top Search & Filter Bar (Matching Screenshot 2026-10-01 201506.png) */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Title, author or spine #…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-white border border-[#DDD6C7] text-[#14130F] placeholder-neutral-400 focus:outline-none focus:border-black shadow-sm"
              />
              <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Dropdowns on Right (Meetup, Discussions, Sort) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Meetup Dropdown */}
              <div className="relative">
                <select
                  value={selectedMeetup ?? ''}
                  onChange={(e) => setSelectedMeetup(e.target.value ? Number(e.target.value) : null)}
                  className={`pl-3 pr-7 py-2 rounded-xl text-xs font-medium border appearance-none cursor-pointer focus:outline-none transition-colors shadow-sm ${
                    selectedMeetup !== null
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white border-[#DDD6C7] text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <option value="" className="text-neutral-800 bg-white">All Meetups</option>
                  {availableMeetups.map((m) => (
                    <option key={m.number} value={m.number} className="text-neutral-800 bg-white">
                      Meetup #{m.number} ({m.count} {m.count === 1 ? 'book' : 'books'})
                    </option>
                  ))}
                </select>
                <span className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] ${
                  selectedMeetup !== null ? 'text-white' : 'text-neutral-500'
                }`}>▼</span>
              </div>

              {/* Discussions Filter Dropdown */}
              <div className="relative">
                <select
                  value={discussionFilter}
                  onChange={(e) => setDiscussionFilter(e.target.value as any)}
                  className={`pl-3 pr-7 py-2 rounded-xl text-xs font-medium border appearance-none cursor-pointer focus:outline-none transition-colors shadow-sm ${
                    discussionFilter !== 'all'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white border-[#DDD6C7] text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <option value="all" className="text-neutral-800 bg-white">All Discussions</option>
                  <option value="popular" className="text-neutral-800 bg-white">★ 3+ Discussions</option>
                  <option value="two-plus" className="text-neutral-800 bg-white">2+ Discussions</option>
                  <option value="single" className="text-neutral-800 bg-white">1 Discussion</option>
                </select>
                <span className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] ${
                  discussionFilter !== 'all' ? 'text-white' : 'text-neutral-500'
                }`}>▼</span>
              </div>

              {/* Sort Dropdown (Spine #, Latest, Title, Random) */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any)
                    if (e.target.value === 'random') setShuffleSeed((s) => s + 1)
                  }}
                  className="pl-3 pr-7 py-2 rounded-xl text-xs font-medium border appearance-none cursor-pointer focus:outline-none transition-colors bg-white border-[#DDD6C7] text-neutral-700 hover:border-neutral-400 shadow-sm"
                >
                  <option value="latest">Sort: Latest to Oldest</option>
                  <option value="spine-asc">Sort: Spine # (Ascending)</option>
                  <option value="spine-desc">Sort: Spine # (Descending)</option>
                  <option value="title-asc">Sort: Title (A–Z)</option>
                  <option value="discussions-desc">Sort: Most Discussed</option>
                  <option value="random">Sort: Random Shuffle</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-neutral-500">▼</span>
              </div>
            </div>
          </div>

          {/* YOUR LISTS Section (Screenshot 2026-10-01 201506.png) */}
          <div className="pt-2 pb-4">
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 font-bold block mb-2">
              YOUR LISTS
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setDiscussionFilter('all')
                  setSelectedLetter(null)
                  setSelectedMeetup(null)
                  setSearchQuery('')
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  discussionFilter === 'all' && selectedLetter === null && selectedMeetup === null && searchQuery === ''
                    ? 'bg-[#14130F] text-white shadow-sm'
                    : 'bg-white border border-[#DDD6C7] text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                All books
              </button>

              <button
                onClick={() => setIsPicksTrayOpen(true)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#DDD6C7] text-neutral-700 hover:bg-neutral-100 transition-all flex items-center gap-1.5"
              >
                <span>★ Closet Picks</span>
                <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center">
                  {userPicks.length}
                </span>
              </button>

              <button
                onClick={() => setDiscussionFilter(discussionFilter === 'popular' ? 'all' : 'popular')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  discussionFilter === 'popular'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white border border-[#DDD6C7] text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                ★ Community Favorites
              </button>
            </div>
          </div>

          {/* Sub-bar: Showing X of Y Volumes */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#DDD6C7]">
            <span className="text-xs text-neutral-500 font-sans">
              Showing <strong className="text-neutral-900 font-semibold">{filteredBooks.length.toLocaleString()}</strong> of {books.length.toLocaleString()}
            </span>

            <div className="flex items-center gap-4 text-xs font-medium">
              <Link href="/meetups" className="underline text-neutral-600 hover:text-black">
                Meetups Archive →
              </Link>
              <Link href="/members" className="underline text-neutral-600 hover:text-black">
                Readers Directory →
              </Link>
            </div>
          </div>

          {/* Wall Grid Cards (Matching Screenshot 2026-10-01 201506.png) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {filteredBooks.map((book) => {
              const style = getBookSpineStyle(book.title, book.id)
              const isSaved = userPicks.some((b) => b.id === book.id)
              const hasCover = Boolean(book.cover_url || book.thumbnail_url)
              const coverSrc = book.cover_url || book.thumbnail_url || ''
              const pubYear =
                book.publication_year ||
                (book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : null)

              return (
                <div
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className="group flex flex-col cursor-pointer text-left select-none transition-all duration-200 hover:-translate-y-1.5"
                >
                  {/* Card Front Cover with Criterion Spine Badge */}
                  <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-md group-hover:shadow-2xl transition-all duration-300 border border-[#DDD6C7] bg-[#1E1B18]">
                    {hasCover ? (
                      <img
                        src={coverSrc}
                        alt={book.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}

                    {/* Fallback Artwork if no cover or image fails to load */}
                    <div
                      className={`absolute inset-0 p-3.5 flex flex-col justify-between text-center ${
                        hasCover ? '-z-10' : 'z-0'
                      }`}
                      style={{ backgroundColor: style.palette.bg }}
                    >
                      <div className="w-5 h-px mx-auto opacity-50" style={{ backgroundColor: style.palette.foil }} />
                      <div>
                        <h4
                          className="font-serif font-bold text-xs sm:text-sm leading-snug line-clamp-3 text-white"
                          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                        >
                          {book.title}
                        </h4>
                        {book.author_name && (
                          <p className="mt-1 text-[10px] font-sans uppercase tracking-wider truncate" style={{ color: style.palette.foil }}>
                            {book.author_name}
                          </p>
                        )}
                      </div>
                      <div className="w-5 h-px mx-auto opacity-50" style={{ backgroundColor: style.palette.foil }} />
                    </div>

                    {/* Top-Left Rounded Black Pill Badge: SPINE X (Screenshot 2026-10-01 201506.png) */}
                    <div className="absolute top-2.5 left-2.5 z-10 bg-black/85 text-white text-[9px] sm:text-[9.5px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow-md border border-white/20">
                      SPINE {style.numericSpine}
                    </div>

                    {/* Saved In Picks Indicator */}
                    {isSaved && (
                      <div className="absolute top-2.5 right-2.5 z-10 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
                    )}

                    {/* Hover sheen */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>

                  {/* Caption underneath: Title in bold serif, Subtitle and Meetup tags */}
                  <div className="mt-2.5 px-0.5">
                    <h3 className="font-serif font-bold text-xs sm:text-sm leading-snug text-[#14130F] line-clamp-1 group-hover:underline block">
                      {book.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-neutral-500 truncate block mt-0.5">
                      {pubYear ? `${pubYear} · ` : ''}{book.author_name || 'Bangalore Book Club'}
                    </p>
                    {book.meetups && book.meetups.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        {book.meetups.slice(0, 2).map((m) => (
                          <span
                            key={`m-${book.id}-${m.number}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMeetup(m.number)
                            }}
                            className="inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-amber-100/90 hover:bg-amber-200 text-amber-900 border border-amber-300/70 transition-colors"
                            title={`Filter archive by Meetup #${m.number}`}
                          >
                            #{m.number}
                          </span>
                        ))}
                        {book.meetups.length > 2 && (
                          <span className="text-[9px] font-mono text-neutral-400">
                            +{book.meetups.length - 2}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-neutral-400 ml-auto">
                          {book.discussion_count} {book.discussion_count === 1 ? 'disc' : 'discs'}
                        </span>
                      </div>
                    )}
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

                {/* Meetup Facet */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                      Filter by Meetup
                    </span>
                    {selectedMeetup !== null && (
                      <button
                        onClick={() => setSelectedMeetup(null)}
                        className="text-[10px] font-mono text-amber-300 hover:underline"
                      >
                        Clear (M#{selectedMeetup})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={selectedMeetup ?? ''}
                      onChange={(e) => setSelectedMeetup(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="" className="bg-[#14100D] text-white">All Meetups ({availableMeetups.length})</option>
                      {availableMeetups.map((m) => (
                        <option key={m.number} value={m.number} className="bg-[#14100D] text-white">
                          Meetup #{m.number} ({m.count} {m.count === 1 ? 'book' : 'books'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                    {availableMeetups.slice(0, 16).map((m) => (
                      <button
                        key={`drawer-m-${m.number}`}
                        onClick={() => setSelectedMeetup(selectedMeetup === m.number ? null : m.number)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors ${
                          selectedMeetup === m.number
                            ? 'bg-amber-500 text-black font-bold shadow-sm'
                            : 'bg-white/5 hover:bg-white/15 text-white/80'
                        }`}
                      >
                        #{m.number}
                      </button>
                    ))}
                  </div>
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

                {/* Sort Sequence Facet */}
                <div className="mt-6">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block mb-2.5">
                    Sort Sequence
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { id: 'random', label: '🔀 Random Order' },
                      { id: 'latest', label: '⚡ Latest Meetups / Most Recent (Default)' },
                      { id: 'title-asc', label: 'Title (A–Z)' },
                      { id: 'discussions-desc', label: 'Most Discussed' },
                      { id: 'spine-asc', label: 'Spine # (Ascending)' },
                      { id: 'spine-desc', label: 'Spine # (Descending)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSortBy(s.id as any)
                          if (s.id === 'random') setShuffleSeed((seed) => seed + 1)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-serif transition-colors ${
                          sortBy === s.id
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {s.label}
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
                    setSelectedMeetup(null)
                    setSearchQuery('')
                    setSortBy('latest')
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
          5. DETAIL MODAL:
          - List View: CriterionListDetailModal (Exact match with Screenshots 1 & 2)
          - Closet View: CriterionDetailModal (3D Stage with 360° Rotatable Book)
          ======================================================= */}
      <AnimatePresence>
        {selectedBook && (
          viewMode === 'list' ? (
            <CriterionListDetailModal
              book={selectedBook}
              allBooks={filteredBooks}
              userPicks={userPicks}
              onTogglePick={handleTogglePick}
              onClose={() => setSelectedBook(null)}
              onSelectBook={(b) => setSelectedBook(b)}
              onShowToast={showToast}
            />
          ) : (
            <CriterionDetailModal
              book={selectedBook}
              allBooks={filteredBooks}
              userPicks={userPicks}
              onTogglePick={handleTogglePick}
              onClose={() => setSelectedBook(null)}
              onSelectBook={(b) => setSelectedBook(b)}
              onShowToast={showToast}
            />
          )
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
