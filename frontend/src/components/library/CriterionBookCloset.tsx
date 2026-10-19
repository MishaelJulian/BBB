'use client'

import * as React from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { fetchBook, fetchBooks, getPersistentData, setPersistentData, type Book } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { CriterionListDetailModal } from './CriterionListDetailModal'
import { authFetch, getSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useMe } from '@/components/club/useMe'
// mockup: the agreed header, search sheet, list grid and one merged book view

// Header controls are plain text, not pills (docs/ux/ADR-ui-revamp.md section 5).
const hdrLink = (dark: boolean) =>
  `underline-offset-4 hover:underline ${dark ? 'text-paper/85 hover:text-paper' : 'text-ink-light hover:text-ink'}`
const hdrTab = (dark: boolean, on: boolean) =>
  `underline-offset-4 ${
    on ? 'font-semibold underline decoration-2' : dark ? 'text-paper/70 hover:text-paper hover:underline' : 'text-muted hover:text-ink hover:underline'
  }`

/** The admin link is shown to signed-in admins only. */
function AdminLink({ className }: { className?: string }) {
  const [isAdmin, setIsAdmin] = React.useState(false)
  React.useEffect(() => {
    getSession()
      .then((u) => setIsAdmin(u?.role === 'admin'))
      .catch(() => setIsAdmin(false))
  }, [])
  return isAdmin ? (
    <Link href="/admin" className={className}>
      Admin
    </Link>
  ) : null
}

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

  // Heights: 165px to 215px, Widths: 22px to 37px
  const height = 165 + (absHash % 48)
  const width = 22 + (absHash % 15)

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
  isMobile?: boolean
  rowIsFull?: boolean
  hasDraggedRef?: React.MutableRefObject<boolean>
}

const ClosetSpine = React.memo(function ClosetSpine({
  book,
  isSelected,
  isHoveredByReticle,
  isSaved,
  onSelect,
  onHover,
  isMobile = false,
  rowIsFull = false,
  hasDraggedRef,
}: ClosetSpineProps) {
  const [isMouseHovered, setIsMouseHovered] = React.useState(false)
  const isTargeted = isHoveredByReticle || (!isMobile && isMouseHovered)
  const styleInfo = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])
  const { palette, spineNo, height, width } = styleInfo

  const spineWidth = width
  const spineHeight = height

  return (
    <div
      data-book-id={book.id}
      className={`relative select-none transition-all duration-200 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        rowIsFull ? 'flex-1 min-w-[24px] max-w-[42px]' : 'shrink-0'
      }`}
      style={{
        width: rowIsFull ? undefined : Math.max(24, spineWidth),
        height: 220,
        display: 'flex',
        alignItems: 'flex-end',
        transformStyle: isMobile ? 'flat' : 'preserve-3d',
      }}
      onMouseEnter={() => {
        if (!isMobile) {
          setIsMouseHovered(true)
          onHover(book)
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          setIsMouseHovered(false)
          onHover(null)
        }
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (hasDraggedRef?.current) return

        if (isMobile) {
          if (isTargeted) {
            onSelect(book)
          } else {
            onHover(book)
          }
        } else {
          onSelect(book)
        }
      }}
      // Keyboard and screen-reader access, same as a click; focus shows the hover preview.
      role="button"
      tabIndex={0}
      aria-label={`${spineNo} ${book.title}${book.author_name ? ` ${book.author_name}` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onSelect(book)
        }
      }}
      onFocus={() => onHover(book)}
      onBlur={() => onHover(null)}
      onTouchEnd={(e) => {
        e.stopPropagation()
      }}
    >
      {/* Contact Shadow on shelf board (desktop only to prevent mobile GPU blur bottleneck) */}
      {!isMobile && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/80 blur-[2px] pointer-events-none transition-all duration-200"
          style={{
            width: isTargeted || isSelected ? '120%' : '80%',
            height: isTargeted || isSelected ? 8 : 4,
            opacity: isTargeted || isSelected ? 0.9 : 0.45,
          }}
        />
      )}

      {/* Physical Spine with 3D lift on desktop and lightweight 2D lift on mobile */}
      <div
        className="relative rounded-t-[3px] rounded-b-[1px] overflow-hidden shadow-lg transition-transform duration-200 w-full"
        style={{
          width: rowIsFull ? '100%' : spineWidth,
          height: spineHeight,
          backgroundColor: palette.bg,
          transform: isSelected
            ? (isMobile ? 'translateY(-16px) scale(1.08)' : 'translateZ(36px) translateY(-18px) scale(1.08)')
            : isTargeted
            ? (isMobile ? 'translateY(-12px) scale(1.06)' : 'translateZ(24px) translateY(-12px) scale(1.05)')
            : isMobile
            ? 'none'
            : 'translateZ(0px) translateY(0px) scale(1)',
          transformOrigin: 'bottom center',
          boxShadow: isMobile
            ? (isTargeted ? '0 0 0 1.5px #10B981' : undefined)
            : (isTargeted
                ? `0 0 0 1.5px #10B981, 0 10px 25px rgba(0,0,0,0.85)`
                : `inset 0 0 10px rgba(0,0,0,0.65), inset 1px 0 0 rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.6)`),
        }}
      >
        {/* Saved Stack Heart Badge */}
        {isSaved && (
          <div className="absolute top-1 right-1 z-20 w-2.5 h-2.5 rounded-full bg-paper " />
        )}

        {/* Top Spine Number Box (Criterion Style) */}
        <div className="absolute top-0 inset-x-0 pt-1 pb-1 flex flex-col items-center border-b border-black/40 bg-black/30">
          <span
            className="text-[7.5px] font-mono font-bold tracking-wider leading-none px-0.5"
            style={{ color: palette.foil, textShadow: isMobile ? undefined : '0 1px 2px rgba(0,0,0,0.9)' }}
          >
            {spineNo}
          </span>
        </div>

        {/* Raised Spine Ribs - Desktop only to cut 720 DOM elements on mobile */}
        {!isMobile && (
          <>
            <div className="absolute top-[32%] inset-x-0 h-[2px] bg-black/50 border-t border-white/15" />
            <div className="absolute bottom-[32%] inset-x-0 h-[2px] bg-black/50 border-b border-white/15" />
          </>
        )}

        {/* Vertical Title & Author */}
        <div
          className="absolute inset-x-0 top-8 bottom-6 flex flex-col items-center justify-between py-1 px-0.5"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span
            className="text-[8.5px] font-display font-semibold tracking-wide truncate max-h-[110px]"
            style={{
              color: palette.spineText,
              textShadow: isMobile ? undefined : '0 1px 3px rgba(0,0,0,0.9)',
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

        {/* Curved Specular Sheen - Desktop only */}
        {!isMobile && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 28%, rgba(255,255,255,0.18) 65%, rgba(0,0,0,0.35) 100%)',
            }}
          />
        )}
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
  isMobile?: boolean
  hasDraggedRef?: React.MutableRefObject<boolean>
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
  isMobile = false,
  hasDraggedRef,
}: ShelfWallProps) {
  const totalBooksOnWall = rows.reduce((acc, r) => acc + r.length, 0)

  return (
    <div
      className="flex flex-col justify-center gap-2 select-none"
      style={{ transformStyle: isMobile ? 'flat' : 'preserve-3d' }}
    >
      {/* Brass Plaque Archival Header at top of each shelf wall */}
      <div className="flex items-center justify-between px-4 pb-1 border-b border-white/25 bg-linear-to-r from-black/60 via-amber-950/30 to-black/60 rounded-t ">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-paper " />
          <span className="font-mono text-[10.5px] tracking-[0.25em] text-paper/90 font-bold uppercase">
            SHELF {shelfNumber} · {wallName}
          </span>
        </div>
        <span className="font-mono text-[9px] tracking-widest text-white/50 uppercase">
          {totalBooksOnWall} Volumes
        </span>
      </div>

      {/* 5 Shelf Rows (Tiers 0–4) */}
      {rows.map((rowBooks, rIdx) => {
        const isFull = rowBooks.length >= 20
        return (
          <div key={`shelf-${shelfNumber}-row-${rIdx}`} className="relative flex flex-col">
            {/* Spines on Row (Sitting closely touching on the shelf plank) */}
            <div className="flex items-end px-2 space-x-px w-full min-h-[220px] overflow-hidden">
              {rowBooks.map((book) => (
                <ClosetSpine
                  key={`b-${book.id}`}
                  book={book}
                  isSelected={selectedBookId === book.id}
                  isHoveredByReticle={hoveredBookId === book.id}
                  isSaved={userPicks.some((b) => b.id === book.id)}
                  onSelect={onSelectBook}
                  onHover={onHoverBook}
                  isMobile={isMobile}
                  rowIsFull={isFull}
                  hasDraggedRef={hasDraggedRef}
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
      )})}
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
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Your picks">
      <div className="fixed inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-h-[88dvh] overflow-auto bg-[#faf8f5] text-[#1a1a1a] border-t-2 border-[#1a1a1a] p-4">
        <div className="flex items-center justify-between">
          <h3 className="m-0 font-serif text-2xl font-semibold">Your picks</h3>
          <button type="button" onClick={onClose} className="min-h-11 px-1 underline decoration-2 decoration-[#c93a14] underline-offset-[5px] text-base">Close</button>
        </div>
        <p className="mt-1 text-sm text-[#4a4a4a]">{userPicks.length} of 4 picks used</p>
        <div className="mt-2">
          {Array.from({ length: 4 }).map((_, idx) => {
            const book = userPicks[idx]
            if (!book) {
              return (
                <div key={`empty-${idx}`} className="flex items-center gap-3 min-h-16 py-2 border-t border-[#d4cfc9] text-[#4a4a4a]">
                  <span className="w-10 text-center font-semibold">{idx + 1}</span>
                  <span>Empty</span>
                </div>
              )
            }
            const styleInfo = getBookSpineStyle(book.title, book.id)
            const coverSrc = book.cover_url || book.thumbnail_url || ''
            return (
              <div key={`pick-${book.id}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 min-h-16 py-2 border-t border-[#d4cfc9]">
                <button type="button" onClick={() => { onClose(); onSelectBook(book) }} aria-label={`Open ${book.title}`} className="block w-12">
                  {coverSrc ? (
                    <img src={coverSrc} alt="" referrerPolicy="no-referrer" className="block w-12 aspect-2/3 object-cover border-2 border-[#1a1a1a]" />
                  ) : (
                    <span className="flex w-12 aspect-2/3 items-end border-2 border-[#1a1a1a] p-1 font-mono text-[10px]">#{styleInfo.numericSpine}</span>
                  )}
                </button>
                <button type="button" onClick={() => { onClose(); onSelectBook(book) }} className="text-left">
                  <span className="block font-serif font-semibold text-base leading-snug line-clamp-2">{book.title}</span>
                  <span className="block text-sm text-[#4a4a4a]">{(book as any).tag ? (book as any).tag + ' \u00b7 ' : ''}{book.author_name || 'Author not recorded'}</span>
                </button>
                <button type="button" onClick={() => onRemovePick(book.id)} aria-label={`Remove ${book.title}`} className="min-h-11 px-1 underline decoration-2 decoration-[#c93a14] underline-offset-[5px] text-base">Remove</button>
              </div>
            )
          })}
        </div>
        {userPicks.length > 0 && (
          <button type="button" onClick={() => { onClose(); onOpenPolaroid() }} className="mt-3 w-full min-h-12 px-4 bg-[#1a1a1a] text-[#faf8f5] font-semibold text-base shadow-[3px_3px_0_0_#f15534]">Take a Polaroid ({userPicks.length}/4)</button>
        )}
      </div>
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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
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

  // HTML5 Canvas Polaroid Renderer with Real Front Cover Images
  const handleDownload = async () => {
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

      // Preload / retrieve all front cover images in parallel
      const loadedImages = await Promise.all(
        userPicks.map(async (book) => {
          const coverSrc = book.cover_url || book.thumbnail_url
          if (!coverSrc) return null

          const domImg = document.getElementById(`polaroid-cover-${book.id}`) as HTMLImageElement | null
          if (domImg && domImg.complete && domImg.naturalWidth > 0) {
            return domImg
          }

          return new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
            img.src = coverSrc
          })
        })
      )

      // Draw books (Front Covers)
      const picksCount = userPicks.length
      const slotWidth = photoW / (picksCount || 1)

      userPicks.forEach((book, i) => {
        const style = getBookSpineStyle(book.title, book.id)
        const bookW = Math.min(180, slotWidth * 0.85)
        const bookH = Math.round(bookW * 1.5) // standard 2:3 book cover ratio
        const bookX = photoX + slotWidth * i + (slotWidth - bookW) / 2
        const bookY = plankY - bookH + 10

        // Shelf contact shadow
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.beginPath()
        ctx.ellipse(bookX + bookW / 2, plankY + 8, bookW * 0.65, 12, 0, 0, Math.PI * 2)
        ctx.fill()

        const imgObj = loadedImages[i]
        if (imgObj && imgObj.naturalWidth > 0) {
          try {
            ctx.save()
            drawRoundedRect(ctx, bookX, bookY, bookW, bookH, 6)
            ctx.clip()

            ctx.drawImage(imgObj, bookX, bookY, bookW, bookH)

            // Subtle left-edge spine book crease shadow
            const spineGrad = ctx.createLinearGradient(bookX, bookY, bookX + 18, bookY)
            spineGrad.addColorStop(0, 'rgba(0,0,0,0.45)')
            spineGrad.addColorStop(1, 'transparent')
            ctx.fillStyle = spineGrad
            ctx.fillRect(bookX, bookY, 18, bookH)

            ctx.restore()

            // Outer cover border
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'
            ctx.lineWidth = 1.5
            drawRoundedRect(ctx, bookX, bookY, bookW, bookH, 6)
            ctx.stroke()
          } catch (_) {
            // In case of any CORS taint error, fall back to styled cover
            ctx.fillStyle = style.palette.bg
            ctx.fillRect(bookX, bookY, bookW, bookH)
          }
        } else {
          ctx.fillStyle = style.palette.bg
          ctx.fillRect(bookX, bookY, bookW, bookH)

          ctx.strokeStyle = style.palette.foil
          ctx.lineWidth = 2
          ctx.strokeRect(bookX + 5, bookY + 5, bookW - 10, bookH - 10)

          ctx.fillStyle = '#FAF7F0'
          ctx.font = 'bold 15px Georgia'
          const words = book.title.split(' ')
          let line = ''
          let curY = bookY + 60
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' '
            const metrics = ctx.measureText(testLine)
            if (metrics.width > bookW - 24 && n > 0) {
              ctx.fillText(line, bookX + bookW / 2, curY)
              line = words[n] + ' '
              curY += 20
              if (curY > bookY + bookH - 50) break
            } else {
              line = testLine
            }
          }
          ctx.fillText(line, bookX + bookW / 2, curY)

          if (book.author_name) {
            ctx.fillStyle = style.palette.foil
            ctx.font = 'italic 12px Georgia'
            ctx.fillText(book.author_name.slice(0, 20), bookX + bookW / 2, bookY + bookH - 22)
          }
        }

        // Spine badge in top-left corner
        ctx.fillStyle = 'rgba(0,0,0,0.85)'
        drawRoundedRect(ctx, bookX + 6, bookY + 6, 48, 20, 10)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`#${style.numericSpine}`, bookX + 30, bookY + 20)
      })

      // Signature & Stamp
      ctx.fillStyle = '#1C1917'
      ctx.font = 'italic bold 42px Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText(`“${signee}”`, photoX + 20, photoY + photoH + 110)

      ctx.fillStyle = '#78716C'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('THE BBB LIBRARY · BANGALORE', photoX + photoW - 20, photoY + photoH + 105)

      const link = document.createElement('a')
      link.download = `bbb-library-picks-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Failed to export polaroid:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopy = () => {
    const text = `My BBB Library Picks:\n${userPicks.map((b) => `• ${b.title}`).join('\n')}\n— Curated at The BBB Library`
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/85 " onClick={onClose} />

      <m.div
        initial={{ opacity: 0, scale: 0.9, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 25 }}
        className="relative z-10 w-full max-w-lg flex flex-col items-center"
      >
        {/* POLAROID FRAME */}
        <div className="w-full bg-paper p-5 pb-7 rounded-xs shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-neutral-300 flex flex-col items-center">
          
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

            <div className="absolute inset-x-0 bottom-0 h-16 bg-[#322013] border-t-2 border-white/25 shadow-2xl" />

            <div className="relative z-10 flex items-end justify-center gap-2 sm:gap-3 mb-1 w-full px-2">
              {userPicks.map((book) => {
                const style = getBookSpineStyle(book.title, book.id)
                const hasCover = Boolean(book.cover_url || book.thumbnail_url)
                const coverSrc = book.cover_url || book.thumbnail_url || ''
                return (
                  <div
                    key={`polaroid-book-${book.id}`}
                    className="relative w-20 sm:w-24 md:w-28 aspect-2/3 rounded-[3px] overflow-hidden shadow-2xl border border-white/20 bg-[#1E1B18] flex flex-col shrink-0"
                  >
                    {hasCover ? (
                      <img
                        id={`polaroid-cover-${book.id}`}
                        src={coverSrc}
                        alt={book.title}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full p-2 flex flex-col justify-between text-center"
                        style={{ backgroundColor: style.palette.bg }}
                      >
                        <div className="w-4 h-0.5 mx-auto opacity-50" style={{ backgroundColor: style.palette.foil }} />
                        <span className="text-[9px] sm:text-[10px] font-serif font-bold text-white line-clamp-3 leading-snug">
                          {book.title}
                        </span>
                        <span className="text-[7.5px] font-serif uppercase tracking-wider text-white/70 truncate">
                          {book.author_name || 'BBB'}
                        </span>
                      </div>
                    )}
                    {/* Spine Badge pill */}
                    <div className="absolute top-1 left-1 bg-black/85 text-white text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] border border-white/20">
                      #{style.numericSpine}
                    </div>
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
                className="bg-transparent border-b border-neutral-300 font-serif italic text-lg text-neutral-900 focus:outline-hidden focus:border-paper w-48 mt-0.5"
              />
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-neutral-800 tracking-wider block">
                THE BBB LIBRARY
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
            className="px-6 py-2.5 rounded-[2px] bg-white text-black font-semibold text-xs tracking-wider uppercase transition-all hover:bg-paper-dark shadow-xl flex items-center gap-2"
          >
            <span>{isDownloading ? 'Generating…' : '↓ Download Polaroid'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-5 py-2.5 rounded-[2px] bg-black/60 border border-white/20 hover:bg-black/80 text-white font-medium text-xs tracking-wider uppercase transition-all shadow-lg"
          >
            <span>{isCopied ? '✓ Copied List!' : 'Share Picks'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[2px] text-white/60 hover:text-white text-xs font-mono"
          >
            Close
          </button>
        </div>
      </m.div>
    </div>
  )
}

// ============================================
// 6. Master Criterion Walk-In Corner Closet Component
// ============================================

/** "Rich pull": the shelf list is thin (no description, members, rating...), so fetch the full record when a book is opened and merge it over. */
function useFullBook(book: Book | null): Book | null {
  const [full, setFull] = React.useState<Book | null>(null)
  const id = book?.id
  React.useEffect(() => {
    setFull(null)
    if (!id) return
    let live = true
    fetchBook(id).then((b) => { if (live) setFull(b) }).catch(() => {})
    return () => { live = false }
  }, [id])
  return book ? { ...book, ...(full ?? {}) } : null
}

export function CriterionBookCloset() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const me = useMe()
  const selectParam = searchParams.get('select')
  const meetupParam = searchParams.get('meetup')

  // View Mode: 'closet' | 'list'
  const [viewMode, setViewMode] = React.useState<'closet' | 'list'>('closet')

  const [books, setBooks] = React.useState<Book[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null)
  const fullSelectedBook = useFullBook(selectedBook)
  const [hoveredBook, setHoveredBook] = React.useState<Book | null>(null)
  const currentHoveredIdRef = React.useRef<string | null>(null)
  const lastHitTestTimeRef = React.useRef(0)

  // Fast ID to Book Map for instantaneous 0ms touch hover lookups
  const booksById = React.useMemo(() => {
    const map = new Map<string, Book>()
    books.forEach((b) => map.set(b.id, b))
    return map
  }, [books])

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
  const [isSearchSheetOpen, setIsSearchSheetOpen] = React.useState(false)
  const [sheetQ, setSheetQ] = React.useState('')
  const [pendingPick, setPendingPick] = React.useState<Book | null>(null)
  const [pickTag, setPickTag] = React.useState('Favourite')
  const [replaceId, setReplaceId] = React.useState<string | null>(null)
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

  // Touch Drag Motion Values for Mobile 3D Room Navigation (Crisp, zero-lag tracking)
  const touchYawMotion = useMotionValue(0)
  const touchPitchMotion = useMotionValue(0)
  const smoothTouchYaw = useSpring(touchYawMotion, { stiffness: 320, damping: 32 })
  const smoothTouchPitch = useSpring(touchPitchMotion, { stiffness: 320, damping: 32 })
  const touchStartRef = React.useRef({ x: 0, y: 0, startYaw: 0, startPitch: 0 })
  const hasDraggedRef = React.useRef(false)
  const [currentWallIndex, setCurrentWallIndex] = React.useState<0 | 1 | 2>(1) // 0: Left (+38°), 1: Main (0°), 2: Right (-38°)

  // Mobile Pinch & Double-Tap Zoom state (1.0x to 2.5x)
  const [mobileZoom, setMobileZoom] = React.useState(1)
  const pinchStartRef = React.useRef<{ dist: number; startZoom: number }>({ dist: 0, startZoom: 1 })
  const lastTapRef = React.useRef<number>(0)

  // Dynamic responsive scale for mobile: fits the complete 3-wall curved bookshelf comfortably
  const mobileScale = React.useMemo(() => {
    if (!isMobile) return 1
    // For mobile portrait screens (320px - 500px width), scale dynamically so all 3 wings fit
    return Math.min(1, Math.max(0.52, (windowWidth - 20) / 640))
  }, [isMobile, windowWidth])

  // Unified camera rotation combining desktop mouse parallax and mobile touch pan.
  // On mobile: direct tracking gives instant, crisp 60fps 1:1 response without rubber-band lag.
  const camRotateY = useTransform(
    [smoothX, isMobile ? touchYawMotion : smoothTouchYaw],
    ([mx, ty]: any[]) => ((mx as number) * 36) + (ty as number)
  )
  const camRotateX = useTransform(
    [smoothY, isMobile ? touchPitchMotion : smoothTouchPitch],
    ([my, tp]: any[]) => (-(my as number) * 20) + (tp as number)
  )

  const snapToWall = (wallIdx: 0 | 1 | 2) => {
    setCurrentWallIndex(wallIdx)
    const targetYaws = [38, 0, -38] // Left wall +38°, Center 0°, Right -38°
    animate(touchYawMotion, targetYaws[wallIdx], {
      type: 'spring',
      stiffness: 240,
      damping: 26,
    })
    animate(touchPitchMotion, 0, {
      type: 'spring',
      stiffness: 240,
      damping: 26,
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectedBook) return

    // 2-Finger Pinch Zoom detection
    if (e.touches.length === 2) {
      hasDraggedRef.current = true
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      pinchStartRef.current = { dist, startZoom: mobileZoom }
      return
    }

    if (e.touches.length !== 1) return

    // Quick double-tap anywhere on shelves to toggle zoom (1x <-> 1.8x)
    const now = Date.now()
    if (now - lastTapRef.current < 280) {
      setMobileZoom((prev) => (prev > 1.2 ? 1 : 1.8))
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now

    const touch = e.touches[0]
    hasDraggedRef.current = false
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startYaw: touchYawMotion.get(),
      startPitch: touchPitchMotion.get(),
    }

    // Inspect spine directly under initial thumb touch
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const spineEl = el?.closest('[data-book-id]') as HTMLElement | null
    if (spineEl?.dataset?.bookId) {
      const bId = spineEl.dataset.bookId
      if (bId !== currentHoveredIdRef.current) {
        currentHoveredIdRef.current = bId
        const found = booksById.get(bId)
        if (found) {
          setHoveredBook(found)
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(8)
            }
          } catch (_) {}
        }
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (selectedBook) return

    // Handle 2-Finger Pinch to Zoom smoothly in real time
    if (e.touches.length === 2 && pinchStartRef.current.dist > 0) {
      if (e.cancelable) e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scaleFactor = dist / pinchStartRef.current.dist
      const nextZoom = Math.min(2.5, Math.max(1, pinchStartRef.current.startZoom * scaleFactor))
      setMobileZoom(Number(nextZoom.toFixed(2)))
      return
    }

    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasDraggedRef.current = true
    }

    if (e.cancelable) e.preventDefault()

    // Smooth, responsive free-look panning up/down/left/right across all shelves (adjusted for zoom)
    const sensitivity = mobileZoom > 1.4 ? 0.18 : 0.28
    const newYaw = Math.max(-56, Math.min(56, touchStartRef.current.startYaw + dx * sensitivity))
    const newPitch = Math.max(-24, Math.min(24, touchStartRef.current.startPitch - dy * (sensitivity * 0.7)))
    touchYawMotion.set(newYaw)
    touchPitchMotion.set(newPitch)

    // Detect book spine under thumb as it scrubs past shelves (throttled to 20Hz to prevent forced layout thrashing)
    const now = Date.now()
    if (now - lastHitTestTimeRef.current > 48) {
      lastHitTestTimeRef.current = now
      const moveEl = document.elementFromPoint(touch.clientX, touch.clientY)
      const moveSpineEl = moveEl?.closest('[data-book-id]') as HTMLElement | null
      if (moveSpineEl?.dataset?.bookId) {
        const bId = moveSpineEl.dataset.bookId
        if (bId !== currentHoveredIdRef.current) {
          currentHoveredIdRef.current = bId
          const found = booksById.get(bId)
          if (found) {
            setHoveredBook(found)
            try {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(6)
              }
            } catch (_) {}
          }
        }
      }
    }
  }

  const handleTouchEnd = () => {
    pinchStartRef.current = { dist: 0, startZoom: mobileZoom }
    // Update wall index highlight based on camera direction without violent snapping
    const yaw = touchYawMotion.get()
    let targetIdx: 0 | 1 | 2 = 1
    if (yaw > 18) targetIdx = 0
    else if (yaw < -18) targetIdx = 2
    else targetIdx = 1

    setCurrentWallIndex(targetIdx)
    // Camera smoothly stays at current pan angle for continuous inspection
  }

  // Sync hash #closet / #list
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash === '#list' || hash === '#wall') {
        React.startTransition(() => {
          setViewMode('list')
          setVisibleListCount(48)
        })
      } else if (hash === '#closet' || hash === '#shelves') {
        React.startTransition(() => {
          setViewMode('closet')
        })
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const switchView = (mode: 'closet' | 'list') => {
    React.startTransition(() => {
      setViewMode(mode)
      if (mode === 'list') {
        setVisibleListCount(48)
      }
    })
    window.history.replaceState(null, '', mode === 'list' ? '#list' : '#shelves')
  }

  // Picks live in the database (member_picks), shared across the club. Members and admins with a linked record load theirs.
  const picksOk = me.state === 'member' || me.state === 'admin'
  const applyPicks = (j: any) =>
    setUserPicks(((j?.picks ?? []) as any[]).map((x) => ({ ...x, id: x.book_id, title: x.title, author_name: x.author_name })))
  React.useEffect(() => {
    if (!picksOk) { setUserPicks([]); return }
    let dead = false
    void authFetch('/api/me/picks').then(async (r) => { if (r.ok && !dead) applyPicks(await r.json()) }).catch(() => {})
    return () => { dead = true }
  }, [picksOk])

  // Load cached books immediately on mount for 0ms instant display!
  React.useEffect(() => {
    let isMounted = true
    try {
      const cached = sessionStorage.getItem('bbb_archive_books') || localStorage.getItem('bbb_archive_books')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBooks(parsed)
          setLoading(false)
          return
        }
      }
    } catch {}

    // Check persistent IndexedDB cache for cross-session 0ms instant load
    getPersistentData<Book[]>('bbb_archive_books').then((persisted) => {
      if (isMounted && Array.isArray(persisted) && persisted.length > 0) {
        setBooks(persisted)
        setLoading(false)
      }
    }).catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch books (only keep books discussed in the database, exclude general discussion and tangents)
  const loadBooks = React.useCallback(async (silent = false, force = false) => {
    try {
      if (!silent) {
        setLoading((prev) => books.length === 0 ? true : prev)
      }
      setLoadError(null)
      const data = await fetchBooks({
        limit: 3000,
        onlyDiscussed: true,
        excludeGeneral: true,
        fields: 'shelf',
        forceRefresh: force,
      })
      const discussedBooks = (data || []).filter((b) => {
        const hasDiscussions = Boolean(b.discussion_count && b.discussion_count > 0) || Boolean(b.meetups && b.meetups.length > 0)
        const isNotGeneral = !b.is_general_discussion
        const isNotTangent = !b.title?.toLowerCase().includes('(tangent)')   // tangent mentions are already folded into is_general_discussion by the server
        return hasDiscussions && isNotGeneral && isNotTangent
      })
      setBooks(discussedBooks)
      setSelectedBook((prev) => (prev && !discussedBooks.some((b) => b.id === prev.id) ? null : prev))
      try {
        sessionStorage.setItem('bbb_archive_books', JSON.stringify(discussedBooks))
      } catch {}
      setPersistentData('bbb_archive_books', discussedBooks).catch(() => {})
      return discussedBooks.length
    } catch (err) {
      console.error('Failed to load books for closet:', err)
      // Only show error if no books are currently available
      if (books.length === 0) {
        setLoadError('The archive could not be loaded. The Library Room is still here.')
      }
      if (silent) throw err
    } finally {
      setLoading(false)
    }
  }, [books.length])

  React.useEffect(() => {
    loadBooks(books.length > 0)
  }, [loadBooks])

  // Reset to first shelves when filters or sort change
  React.useEffect(() => {
    setShelfSection(0)
  }, [searchQuery, discussionFilter, selectedLetter, selectedMeetup, sortBy])

  const handleSyncDatabase = async () => {
    setIsSyncing(true)
    try {
      try {
        sessionStorage.removeItem('bbb_archive_books')
        sessionStorage.removeItem('bbb_archive_members')
        sessionStorage.removeItem('bbb_archive_meetups')
      } catch {}
      const count = await loadBooks(true, true)
      setSelectedBook((prev) => (prev && !(books || []).some((b) => b.id === prev.id) ? null : prev))
      showToast(`Archive synced with database (${(count ?? books.length).toLocaleString()} volumes)`)
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
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (selectedBook) return // modal handles its own arrows
      // R4: leave browser shortcuts (Ctrl/Cmd+R, F, S, V ...) alone; only Ctrl/Cmd+K is ours.
      const modified = e.ctrlKey || e.metaKey || e.altKey
      if (modified && !(e.key === 'k' && (e.ctrlKey || e.metaKey))) return

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
        const activeInput = document.getElementById(
          viewMode === 'closet' ? 'closet-search-input' : 'list-search-input'
        ) || document.getElementById('closet-search-input')
        activeInput?.focus()
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

  const sendPick = async (method: 'POST' | 'DELETE', body: Record<string, unknown>) => {
    const r = await authFetch('/api/me/picks', { method, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null)
    if (r.ok) { applyPicks(j); return true }
    showToast(j?.detail || j?.error?.message || 'Could not save your picks.')
    return false
  }

  const handleTogglePick = (book: Book) => {
    if (me.state === 'loading') return
    if (me.state === 'out') { router.push('/login'); return }
    if (me.state === 'new') { router.push('/me'); return }
    if (userPicks.some((b) => b.id === book.id)) {
      void sendPick('DELETE', { book_id: book.id }).then((ok) => ok && showToast('Removed "' + book.title + '" from your picks'))
      return
    }
    setPickTag('Favourite')
    setReplaceId(userPicks[0]?.id ?? null)
    setPendingPick(book)
  }

  const confirmPick = () => {
    if (!pendingPick) return
    const b = pendingPick
    const body: Record<string, unknown> = { book_id: b.id, tag: pickTag }
    if (userPicks.length >= 4) body.replace_book_id = replaceId
    void sendPick('POST', body).then((ok) => {
      if (ok) { showToast('Added "' + b.title + '" to your picks'); setPendingPick(null) }
    })
  }

  const handleRemovePick = (bookId: string) => {
    void sendPick('DELETE', { book_id: bookId })
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
      const isNotTangent = !b.title?.toLowerCase().includes('(tangent)')   // tangent mentions are already folded into is_general_discussion by the server
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
      const spineOf = new Map(list.map((b) => [b.id, getBookSpineStyle(b.title, b.id).numericSpine]))
      list.sort((a, b) => (spineOf.get(a.id) ?? 0) - (spineOf.get(b.id) ?? 0))
    } else {
      // DEFAULT: 'latest' (latest meetup number descending, then newest date descending)
      const newestMeetup = new Map(list.map((b) => [b.id, Math.max(0, ...(b.meetups || []).map((mt) => mt.number || 0))]))
      list.sort((a, b) => {
        const maxMeetupA = newestMeetup.get(a.id) ?? 0
        const maxMeetupB = newestMeetup.get(b.id) ?? 0
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

  // Progressive chunking for List View: render first 48 volumes instantaneously (<5ms),
  // then append 60 more as user scrolls down without freezing the main thread.
  const [visibleListCount, setVisibleListCount] = React.useState(48)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    setVisibleListCount(48)
  }, [searchQuery, selectedMeetup, discussionFilter, selectedLetter, sortBy])

  React.useEffect(() => {
    if (viewMode !== 'list') return
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleListCount((prev) => Math.min(filteredBooks.length, prev + 60))
        }
      },
      { rootMargin: '600px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [viewMode, filteredBooks.length, visibleListCount])

  const displayedBooks = React.useMemo(() => {
    return filteredBooks.slice(0, visibleListCount)
  }, [filteredBooks, visibleListCount])

  // =======================================================
  // 3-WALL SHELVING LAYOUT CALCULATIONS (Matching User Drawing 2 & 3)
  // Flow: Shelf 1 (Left Wall, Rows 0-4 top-to-bottom, left-to-right) ->
  //       Shelf 2 (Center Wall, Rows 0-4) ->
  //       Shelf 3 (Right Wall, Rows 0-4) ->
  //       Next Shelves Section (Shelves 4-6, 7-9, etc.)
  // =======================================================
  const BOOKS_PER_ROW = 24
  const ROWS_PER_SHELF = 5
  const BOOKS_PER_SHELF = BOOKS_PER_ROW * ROWS_PER_SHELF // 120
  const SHELVES_PER_SECTION = 3
  const BOOKS_PER_SECTION = BOOKS_PER_SHELF * SHELVES_PER_SECTION // 360

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

  const sheetResults = React.useMemo(() => {
    const v = sheetQ.trim().toLowerCase().replace(/^#/, '')
    if (v.length < 2) return [] as Book[]
    return books.filter((b) => (`${b.title} ${b.author_name || ''}`).toLowerCase().includes(v) || String(getBookSpineStyle(b.title, b.id).numericSpine) === v).slice(0, 30)
  }, [sheetQ, books])
  const activeFiltersCount = (discussionFilter !== 'all' ? 1 : 0) + (selectedLetter ? 1 : 0) + (selectedMeetup !== null ? 1 : 0)

  return (
    <LazyMotion features={domAnimation}>
    <div
      suppressHydrationWarning
      className={`relative min-h-screen w-screen transition-colors duration-500 overflow-x-hidden ${
        viewMode === 'closet' ? 'bg-[#070709] text-paper cursor-crosshair' : 'bg-[#faf8f5] text-[#1a1a1a]'
      }`}
      onMouseMove={handleMouseMove}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 inset-x-0 mx-auto w-fit z-50 px-5 py-2 rounded-[2px] bg-black/90 border border-white/20 text-white text-xs font-mono shadow-2xl pointer-events-none"
          >
            {toastMessage}
          </m.div>
        )}
      </AnimatePresence>

      {/* GREEN RETICLE CURSOR (Desktop only, driven by MotionValues with zero React re-renders) */}
      {viewMode === 'closet' && !selectedBook && !isMobile && (
        <m.div
          className="fixed pointer-events-none z-50 hidden md:block"
          style={{
            x: cursorX,
            y: cursorY,
            translateX: '-50%',
            translateY: '-50%',
          }}
        >
          <div className="w-5 h-5 rounded-[2px] border-2 border-emerald-400 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-emerald-300" />
          </div>
        </m.div>
      )}

      {/* =======================================================
          1. THE CRITERION CLOSET CHROME & MARQUEE
          ======================================================= */}
      <header className="sticky top-0 z-40 w-full bg-[#faf8f5] text-[#1a1a1a] border-b-2 border-[#1a1a1a]">
        <div className="px-4 flex items-center min-h-[56px] gap-1.5">
          <a href="/" aria-label="Back to Home" className="-ml-3 min-w-11 min-h-11 inline-flex items-center justify-center text-[28px] leading-none font-semibold text-[#1a1a1a] no-underline">&lsaquo;</a>
          <h1 className="m-0 font-serif text-[22px] leading-7 font-semibold">Library</h1>
          <div role="group" aria-label="View" className="ml-auto flex">
            {(['closet', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => switchView(mode)}
                className={`min-h-11 px-2.5 text-base ${viewMode === mode ? 'font-semibold underline decoration-2 decoration-[#c93a14] underline-offset-[7px]' : 'text-[#4a4a4a]'}`}
              >
                {mode === 'closet' ? 'Closet' : 'List'}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsSearchSheetOpen(true)}
            className="flex w-full min-h-11 mb-2 items-center justify-between border-b-2 border-[#1a1a1a] text-base text-[#4a4a4a]"
          >
            <span>Search title, author, number</span>
            <span aria-hidden="true">&#9906;</span>
          </button>
        </div>
      </header>

      {/* =======================================================
          2. VIEW MODE A: 3-WALL 3D WALK-IN CLOSET (Matching MS Paint Drawings 2 & 3)
          ======================================================= */}
      {viewMode === 'closet' && (
        <main
          className="relative w-full h-[calc(100dvh-110px-var(--tab,56px))] overflow-hidden flex items-center justify-center select-none"
          style={{
            perspective: isMobile ? '1000px' : '1150px',
            touchAction: 'none',
            overscrollBehavior: 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (!hasDraggedRef.current && isMobile) {
              setHoveredBook(null)
              currentHoveredIdRef.current = null
            }
          }}
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

          {safeSection > 0 && (
            <button type="button" aria-label="Previous shelves" onClick={() => setShelfSection((s) => Math.max(0, s - 1))} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 min-w-11 h-24 bg-[#faf8f5] text-[#1a1a1a] border-2 border-l-0 border-[#1a1a1a] text-3xl leading-none">&lsaquo;</button>
          )}
          {safeSection < totalSections - 1 && (
            <button type="button" aria-label="Next shelves" onClick={() => setShelfSection((s) => Math.min(totalSections - 1, s + 1))} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 min-w-11 h-24 bg-[#faf8f5] text-[#1a1a1a] border-2 border-r-0 border-[#1a1a1a] text-3xl leading-none">&rsaquo;</button>
          )}

          {loadError && !loading ? (
            <div role="alert" className="text-center space-y-3 z-10 px-6">
              <p className="font-serif text-sm text-paper/90">{loadError}</p>
              <button
                type="button"
                onClick={() => loadBooks()}
                className="px-4 py-2 rounded-[2px] bg-white/10 hover:bg-paper-dark text-white text-sm font-semibold focus:outline-hidden focus-visible:ring-2 focus-visible:ring-paper"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="text-center space-y-3 z-10" role="status" aria-live="polite">
              <div className="inline-block w-8 h-8 border-2 border-white/25 border-t-transparent rounded-full animate-spin" />
              <p className="font-serif text-xs text-paper/90 uppercase tracking-widest">
                Shelving the collection…
              </p>
            </div>
          ) : (
            /* 3D CAMERA RIG (Swivels with mouse parallax on desktop & zero-lag touch drag on mobile) */
            <m.div
              className="absolute top-1/2 left-1/2 w-0 h-0"
              style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform',
                rotateY: camRotateY,
                rotateX: camRotateX,
                translateZ: isMobile ? -280 : -320,
                translateY: isMobile ? -12 : -20,
                scale: isMobile ? mobileScale * mobileZoom : 1,
              }}
            >
              {/* FLOOR PLANE (Polished library dark walnut parquet) - desktop only */}
              {!isMobile && (
                <div
                  className="absolute pointer-events-none hidden md:block"
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
              )}

              {/* CEILING SPOTLIGHT PLANE - desktop only */}
              {!isMobile && (
                <div
                  className="absolute pointer-events-none hidden md:block"
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
              )}

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
                  transformStyle: isMobile ? 'flat' : 'preserve-3d',
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
                  isMobile={isMobile}
                  hasDraggedRef={hasDraggedRef}
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
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-linear-to-b from-amber-600/30 via-amber-400/50 to-amber-700/30" />
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
                  transformStyle: isMobile ? 'flat' : 'preserve-3d',
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
                  isMobile={isMobile}
                  hasDraggedRef={hasDraggedRef}
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
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-linear-to-b from-amber-600/30 via-amber-400/50 to-amber-700/30" />
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
                  transformStyle: isMobile ? 'flat' : 'preserve-3d',
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
                  isMobile={isMobile}
                  hasDraggedRef={hasDraggedRef}
                />
              </div>
            </m.div>
          )}

          {/* Floating Hovered / Selected Case Info Card */}
          <div className="fixed bottom-4 left-3 right-16 sm:inset-x-auto sm:left-6 sm:bottom-6 z-40 pointer-events-none flex justify-center sm:justify-start">
            {hoveredBook && !selectedBook && (
              <m.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                onClick={() => setSelectedBook(hoveredBook)}
                className="bg-[#120F0D]/95 border border-white/25 hover:border-white/50 rounded-[2px] p-3.5 sm:p-4 shadow-2xl sm:text-left w-full max-w-sm pointer-events-auto cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-paper/90 font-bold block">
                      {getBookSpineStyle(hoveredBook.title, hoveredBook.id).spineNo}
                    </span>
                    {hoveredBook.meetups && hoveredBook.meetups.length > 0 && (
                      <span className="text-[10px] font-mono font-medium text-paper/90 bg-paper px-2 py-0.5 rounded border border-white/25">
                        Meetup #{hoveredBook.meetups.map((m) => m.number).join(', #')}
                      </span>
                    )}
                  </div>
                  {isMobile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setHoveredBook(null)
                        currentHoveredIdRef.current = null
                      }}
                      className="w-5 h-5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-xs"
                      title="Dismiss preview"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <h4 className="font-display text-sm font-bold text-white line-clamp-1 leading-snug group-hover:text-paper transition-colors">
                  {hoveredBook.title}
                </h4>
                <p className="text-[11px] text-white/60 font-serif line-clamp-1 mt-0.5">
                  {hoveredBook.author_name || 'BBB Archive'} {hoveredBook.first_discussed_date ? `· ${new Date(hoveredBook.first_discussed_date).getFullYear()}` : ''} {hoveredBook.meetups?.[0]?.venue ? `· ${hoveredBook.meetups[0].venue}` : ''}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isMobile ? 'Tap to pull from shelf ↗' : 'Click to pull from shelf ↗'}
                  </span>
                  <span className="text-[9.5px] font-mono text-neutral-400">
                    {hoveredBook.discussion_count} {hoveredBook.discussion_count === 1 ? 'discussion' : 'discussions'}
                  </span>
                </div>
              </m.div>
            )}
          </div>

          {/* Mobile Zoom Controls (+ / - buttons and current zoom percentage) */}
          {isMobile && (
            <div className="fixed bottom-20 right-3 z-40 flex flex-col items-center gap-1 p-1 rounded-[2px] bg-black/90 border border-white/20 shadow-2xl text-white font-mono pointer-events-auto">
              <button
                type="button"
                onClick={() => setMobileZoom((z) => Math.min(2.5, Number((z + 0.35).toFixed(2))))}
                disabled={mobileZoom >= 2.5}
                className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-white/20 active:bg-paper active:text-black disabled:opacity-30 flex items-center justify-center font-bold text-sm transition"
                title="Zoom in on shelf"
                aria-label="Zoom in on shelf"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setMobileZoom(1)}
                className="px-1 py-0.5 text-[9px] text-paper/90 font-bold hover:text-white transition"
                title="Reset zoom to 1x"
                aria-label="Reset zoom"
              >
                {mobileZoom > 1.05 ? `${Math.round(mobileZoom * 100)}%` : '1x'}
              </button>
              <button
                type="button"
                onClick={() => setMobileZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
                disabled={mobileZoom <= 1.05}
                className="w-8 h-8 rounded-[2px] bg-white/10 hover:bg-white/20 active:bg-paper active:text-black disabled:opacity-30 flex items-center justify-center font-bold text-sm transition"
                title="Zoom out on shelf"
                aria-label="Zoom out on shelf"
              >
                −
              </button>
            </div>
          )}
        </main>
      )}

      {/* =======================================================
          3. VIEW MODE B: LIST VIEW / THE CRITERION WALL (Exact Criterion Layout)
          ======================================================= */}
      {viewMode === 'list' && (
        <main className="px-4 pb-28 pt-2 text-[#1a1a1a] min-h-[calc(100dvh-110px-var(--tab,56px))]">
          <div role="group" aria-label="Show" className="flex gap-4 overflow-x-auto">
            {([['all', 'All'], ['two-plus', 'Discussed 2+'], ['single', 'Discussed once']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={discussionFilter === k}
                onClick={() => setDiscussionFilter(k)}
                className={`min-h-11 whitespace-nowrap text-base ${discussionFilter === k ? 'font-semibold underline decoration-2 decoration-[#c93a14] underline-offset-[7px]' : 'text-[#4a4a4a]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-[#4a4a4a]" aria-live="polite">{filteredBooks.length.toLocaleString('en-IN')} books</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 mt-3">
            {displayedBooks.map((book) => {
              const style = getBookSpineStyle(book.title, book.id)
              const coverSrc = book.cover_url || book.thumbnail_url || ''
              const latest = book.meetups && book.meetups.length > 0 ? book.meetups[0] : null
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBook(book)}
                  aria-label={`${book.title}${book.author_name ? `, by ${book.author_name}` : ''}`}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
                  className="block text-left min-h-11 outline-hidden focus-visible:ring-2 focus-visible:ring-[#c93a14] focus-visible:ring-offset-2"
                >
                  {coverSrc ? (
                    <img src={coverSrc} alt="" loading="lazy" referrerPolicy="no-referrer" className="block w-full aspect-2/3 object-cover border-2 border-[#1a1a1a] bg-[#f0ede8]" />
                  ) : (
                    <div className="w-full aspect-2/3 border-2 border-[#1a1a1a] bg-[#faf8f5] p-3 flex flex-col justify-between">
                      <span className="font-serif font-semibold text-[17px] leading-snug line-clamp-6">{book.title}</span>
                      <small className="font-mono text-[13px] text-[#4a4a4a]">#{style.numericSpine}</small>
                    </div>
                  )}
                  <span className="mt-2 block font-serif font-semibold text-base leading-snug line-clamp-2">{book.title}</span>
                  <span className="block text-sm text-[#4a4a4a]">{book.author_name || 'Author not recorded'}</span>
                  {latest && <span className="block text-[13px] text-[#4a4a4a]">Discussed at #{latest.number}</span>}
                </button>
              )
            })}
          </div>

          {visibleListCount < filteredBooks.length && (
            <div ref={loadMoreRef} className="py-10 flex flex-col items-center">
              <button type="button" onClick={() => setVisibleListCount((c) => Math.min(filteredBooks.length, c + 60))} className="min-h-11 underline decoration-2 decoration-[#c93a14] underline-offset-[6px] text-base font-semibold">
                Load more ({displayedBooks.length} of {filteredBooks.length.toLocaleString('en-IN')})
              </button>
            </div>
          )}
        </main>
      )}

      {/* Floating Filters and Picks, thumb zone */}
      <div className={`fixed bottom-[calc(var(--tab,56px)+12px)] z-40 flex gap-2.5 ${viewMode === 'closet' ? 'right-[76px]' : 'right-4'}`}>
        <button type="button" onClick={() => setIsFilterSheetOpen(true)} className="min-h-12 px-5 bg-[#faf8f5] text-[#1a1a1a] border-2 border-[#1a1a1a] font-semibold text-base">
          Filters{activeFiltersCount > 0 ? ` ${activeFiltersCount}` : ''}
        </button>
        <button type="button" onClick={() => setIsPicksTrayOpen(true)} className="min-h-12 px-5 bg-[#1a1a1a] text-[#faf8f5] font-semibold text-base shadow-[3px_3px_0_0_#f15534]">
          Picks{userPicks.length > 0 ? ` ${userPicks.length}` : ''}
        </button>
      </div>

      {pendingPick && (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-labelledby="pick-t">
          <div className="fixed inset-0 bg-black/45" onClick={() => setPendingPick(null)} />
          <div className="relative w-full max-h-[88dvh] overflow-auto bg-[#faf8f5] text-[#1a1a1a] border-t-2 border-[#1a1a1a] p-4">
            <h3 id="pick-t" className="m-0 font-serif text-2xl font-semibold">{userPicks.length >= 4 ? 'You have four picks' : 'Add to my picks'}</h3>
            <p className="mt-1 font-serif text-base">{pendingPick.title}</p>
            {userPicks.length >= 4 && (
              <fieldset className="mt-3 border-0 p-0">
                <legend className="text-sm font-semibold uppercase tracking-wider text-[#4a4a4a]">Picks are limited to four. Replace which one?</legend>
                {userPicks.map((x) => (
                  <label key={x.id} className="flex items-center gap-3 min-h-11 text-base">
                    <input type="radio" name="rp" checked={replaceId === x.id} onChange={() => setReplaceId(x.id)} className="w-[22px] h-[22px] accent-[#c93a14] m-0" />
                    {x.title}
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset className="mt-3 border-0 p-0">
              <legend className="text-sm font-semibold uppercase tracking-wider text-[#4a4a4a]">Why?</legend>
              {['Favourite', 'Want to read'].map((t) => (
                <label key={t} className="flex items-center gap-3 min-h-11 text-base">
                  <input type="radio" name="pt" checked={pickTag === t} onChange={() => setPickTag(t)} className="w-[22px] h-[22px] accent-[#c93a14] m-0" />
                  {t}
                </label>
              ))}
            </fieldset>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={() => setPendingPick(null)} className="min-h-11 px-1 underline decoration-2 decoration-[#c93a14] underline-offset-[5px] text-base">Cancel</button>
              <button type="button" onClick={confirmPick} className="flex-1 min-h-12 px-4 bg-[#1a1a1a] text-[#faf8f5] font-semibold text-base shadow-[3px_3px_0_0_#f15534]">{userPicks.length >= 4 ? 'Replace pick' : 'Add pick'}</button>
            </div>
          </div>
        </div>
      )}

      {isSearchSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Search the library">
          <div className="fixed inset-0 bg-black/45" onClick={() => setIsSearchSheetOpen(false)} />
          <div className="relative w-full max-h-[88dvh] overflow-auto bg-[#faf8f5] text-[#1a1a1a] border-t-2 border-[#1a1a1a] p-4">
            <label htmlFor="sheet-q" className="block text-sm text-[#4a4a4a]">Search title, author or number</label>
            <div className="flex items-center gap-2">
              <input id="sheet-q" type="search" autoFocus autoComplete="off" value={sheetQ} onChange={(e) => setSheetQ(e.target.value)} placeholder="Dungeon, Dinniman, #102" className="flex-1 min-h-11 bg-transparent border-0 border-b-2 border-[#1a1a1a] text-base outline-hidden" />
              <button type="button" onClick={() => setIsSearchSheetOpen(false)} className="min-h-11 px-1 underline decoration-2 decoration-[#c93a14] underline-offset-[5px] text-base">Close</button>
            </div>
            <div role="list" className="mt-2">
              {sheetResults.map((b) => (
                <button key={b.id} type="button" role="listitem" onClick={() => { setIsSearchSheetOpen(false); setSheetQ(''); setSelectedBook(b) }} className="grid grid-cols-[52px_1fr] w-full min-h-14 items-center py-1.5 border-t border-[#d4cfc9] text-left">
                  <span className="font-mono text-[13px] text-[#4a4a4a]">#{getBookSpineStyle(b.title, b.id).numericSpine}</span>
                  <span className="font-serif font-semibold text-base leading-snug">{b.title}</span>
                  <span className="col-start-2 text-sm text-[#4a4a4a]">{b.author_name || 'Author not recorded'}</span>
                </button>
              ))}
              {sheetQ.trim().length >= 2 && sheetResults.length === 0 && <p className="mt-3 text-base">Nothing found for "{sheetQ.trim()}".</p>}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          4. FILTER SHEET DRAWER
          ======================================================= */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="fixed inset-0 bg-black/45" onClick={() => setIsFilterSheetOpen(false)} />
            <div className="relative w-full max-h-[88dvh] overflow-auto bg-[#faf8f5] text-[#1a1a1a] border-t-2 border-[#1a1a1a] p-4">
              <div className="flex items-center justify-between">
                <h3 className="m-0 font-serif text-2xl font-semibold">Filters</h3>
                <button type="button" onClick={() => setIsFilterSheetOpen(false)} className="min-h-11 px-1 underline decoration-2 decoration-[#c93a14] underline-offset-[5px] text-base">Close</button>
              </div>

              <fieldset className="mt-3 border-0 p-0">
                <legend className="text-sm font-semibold uppercase tracking-wider text-[#4a4a4a]">Meetup</legend>
                <label htmlFor="f-meetup" className="sr-only">Filter by meetup</label>
                <select id="f-meetup" value={selectedMeetup ?? ''} onChange={(e) => setSelectedMeetup(e.target.value ? Number(e.target.value) : null)} className="mt-1 w-full min-h-11 bg-transparent border-0 border-b-2 border-[#1a1a1a] text-base rounded-none">
                  <option value="">All meetups ({availableMeetups.length})</option>
                  {availableMeetups.map((mt) => (
                    <option key={mt.number} value={mt.number}>Meetup #{mt.number} ({mt.count} {mt.count === 1 ? 'book' : 'books'})</option>
                  ))}
                </select>
                <div className="mt-1 flex flex-wrap">
                  {availableMeetups.slice(0, 16).map((mt) => (
                    <button key={`fm-${mt.number}`} type="button" aria-pressed={selectedMeetup === mt.number} onClick={() => setSelectedMeetup(selectedMeetup === mt.number ? null : mt.number)} className={`min-h-11 min-w-11 px-2 text-base ${selectedMeetup === mt.number ? 'font-semibold underline decoration-2 decoration-[#c93a14] underline-offset-[7px]' : 'text-[#4a4a4a]'}`}>#{mt.number}</button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-3 border-0 p-0">
                <legend className="text-sm font-semibold uppercase tracking-wider text-[#4a4a4a]">Discussions</legend>
                {[
                  { id: 'all', label: 'All books' },
                  { id: 'popular', label: '3 or more discussions' },
                  { id: 'two-plus', label: '2 or more discussions' },
                  { id: 'single', label: 'Discussed once' },
                ].map((f) => (
                  <label key={f.id} className="flex items-center gap-3 min-h-11 text-base">
                    <input type="radio" name="f-disc" checked={discussionFilter === f.id} onChange={() => setDiscussionFilter(f.id as any)} className="w-[22px] h-[22px] accent-[#c93a14] m-0" />
                    {f.label}
                  </label>
                ))}
              </fieldset>

              <fieldset className="mt-3 border-0 p-0">
                <legend className="text-sm font-semibold uppercase tracking-wider text-[#4a4a4a]">Sort</legend>
                {[
                  { id: 'latest', label: 'Latest meetup first' },
                  { id: 'title-asc', label: 'Title A to Z' },
                  { id: 'discussions-desc', label: 'Most discussed' },
                  { id: 'spine-asc', label: 'Spine number, low to high' },
                  { id: 'spine-desc', label: 'Spine number, high to low' },
                  { id: 'random', label: 'Random order' },
                ].map((o) => (
                  <label key={o.id} className="flex items-center gap-3 min-h-11 text-base">
                    <input type="radio" name="f-sort" checked={sortBy === o.id} onChange={() => { setSortBy(o.id as any); if (o.id === 'random') setShuffleSeed((seed) => seed + 1) }} className="w-[22px] h-[22px] accent-[#c93a14] m-0" />
                    {o.label}
                  </label>
                ))}
              </fieldset>

              <fieldset className="mt-3 border-0 p-0">
                <legend className="text-sm font-semibold uppercase tracking-wider text-[#4a4a4a]">Starts with</legend>
                <div className="grid grid-cols-7">
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                    <button key={letter} type="button" aria-pressed={selectedLetter === letter} onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)} className={`min-h-11 text-base ${selectedLetter === letter ? 'font-semibold underline decoration-2 decoration-[#c93a14] underline-offset-[7px]' : 'text-[#4a4a4a]'}`}>{letter}</button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => { setDiscussionFilter('all'); setSelectedLetter(null); setSelectedMeetup(null); setSearchQuery(''); setSortBy('latest') }} className="min-h-11 px-1 underline decoration-2 decoration-[#c93a14] underline-offset-[5px] text-base">Reset all</button>
                <button type="button" onClick={() => setIsFilterSheetOpen(false)} className="flex-1 min-h-12 px-4 bg-[#1a1a1a] text-[#faf8f5] font-semibold text-base shadow-[3px_3px_0_0_#f15534]">Show {filteredBooks.length.toLocaleString('en-IN')} books</button>
              </div>
            </div>
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
          <CriterionListDetailModal
            book={fullSelectedBook ?? selectedBook}
            allBooks={filteredBooks}
            userPicks={userPicks}
            onTogglePick={handleTogglePick}
            onClose={() => setSelectedBook(null)}
            onSelectBook={(b) => setSelectedBook(b)}
            onShowToast={showToast}
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
    </LazyMotion>
  )
}
