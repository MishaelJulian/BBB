'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { fetchBookSynopsis, type Book } from '@/lib/api'
import { getBookSpineStyle } from './CriterionBookCloset'

interface CriterionDetailModalProps {
  book: Book
  allBooks: Book[]
  userPicks: Book[]
  onTogglePick: (book: Book) => void
  onClose: () => void
  onSelectBook: (book: Book) => void
  onShowToast: (msg: string) => void
}

/**
 * 3D Rotatable Book Object (Matching Criterion Closet cc.mp4 frames 08, 12, 16, 22)
 * Features:
 * - Real cover art on front face
 * - 3D spine on left face with vertical title, spine # and monogram
 * - Textured cream paper pages edges on right, top and bottom
 * - Realistic back cover face with blurb & barcode
 * - Interactive mouse-follow tilt AND 360° click-and-drag rotation
 */
function Rotatable3DBook({
  book,
  spineStyle,
  coverSrc,
  hasCover,
  isSaved,
  onTogglePick,
  onShowToast,
  onClose,
}: {
  book: Book
  spineStyle: ReturnType<typeof getBookSpineStyle>
  coverSrc: string
  hasCover: boolean
  isSaved: boolean
  onTogglePick: (b: Book) => void
  onShowToast: (msg: string) => void
  onClose: () => void
}) {
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
  const [mouseTilt, setMouseTilt] = React.useState({ x: -16, y: 6 })

  // Track cursor position across the stage for subtle continuous tilt
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) return
      const { innerWidth, innerHeight } = window
      const normX = (e.clientX / innerWidth - 0.5) * 2 // -1 to +1
      const normY = (e.clientY / innerHeight - 0.5) * 2 // -1 to +1
      setMouseTilt({
        x: -16 + normX * 36, // yaw from ~ -52° to +20°
        y: 6 - normY * 18,   // pitch from ~ -12° to +24°
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isDragging])

  // Mouse & Touch Drag Handlers for 360° spinning
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.stopPropagation()
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setDragOffset((prev) => ({
      x: prev.x + dx * 0.75,
      y: Math.max(-55, Math.min(55, prev.y - dy * 0.6)),
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    setIsDragging(false)
  }

  const resetAngle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDragOffset({ x: 0, y: 0 })
    setMouseTilt({ x: -16, y: 6 })
    onShowToast('3D angle reset')
  }

  const currentRotateY = mouseTilt.x + dragOffset.x
  const currentRotateX = mouseTilt.y + dragOffset.y

  // Dimensions
  const W = 250 // Book width
  const H = 365 // Book height
  const D = 32  // Book thickness (spine width)
  const halfD = D / 2
  const halfW = W / 2
  const halfH = H / 2

  const latestMeetup = book.meetups && book.meetups.length > 0 ? book.meetups[0] : null
  const pubYear =
    book.publication_year ||
    (book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : null)

  return (
    <div className="flex flex-col items-center justify-center select-none py-2">
      {/* 3D Viewport with Perspective */}
      <div
        className="relative w-[300px] sm:w-[330px] h-[390px] sm:h-[420px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        style={{ perspective: 1100 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Soft Elliptical Drop Shadow Underneath */}
        <div
          className="absolute -bottom-2 w-48 h-8 rounded-[100%] pointer-events-none transition-transform duration-100"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 50%, transparent 75%)',
            transform: `translateX(${currentRotateY * 0.6}px) scaleX(${1 + Math.abs(currentRotateY) * 0.005})`,
            filter: 'blur(6px)',
          }}
        />

        {/* 3D Rotatable Box */}
        <motion.div
          className="relative w-[250px] h-[365px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.4, 1)',
          }}
        >
          {/* =========================================================
              FACE 1: FRONT COVER (translateZ = +halfD)
              ========================================================= */}
          <div
            className="absolute inset-0 rounded-r-md overflow-hidden bg-[#1A1816] border border-white/20 shadow-2xl backface-hidden"
            style={{
              transform: `translateZ(${halfD}px)`,
              backfaceVisibility: 'hidden',
            }}
          >
            {hasCover ? (
              <img
                src={coverSrc}
                alt={book.title}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              /* Hardcover textured fallback with Criterion foil design */
              <div
                className="w-full h-full p-6 flex flex-col justify-between text-center relative"
                style={{ backgroundColor: spineStyle.palette.bg }}
              >
                <div className="w-8 h-px mx-auto opacity-50" style={{ backgroundColor: spineStyle.palette.foil }} />
                <div>
                  <span
                    className="text-[10px] font-mono tracking-widest uppercase opacity-80 block"
                    style={{ color: spineStyle.palette.foil }}
                  >
                    SPINE {spineStyle.numericSpine}
                  </span>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-white mt-3 leading-snug line-clamp-4">
                    {book.title}
                  </h3>
                  {book.author_name && (
                    <p className="text-xs font-sans mt-2 tracking-wide" style={{ color: spineStyle.palette.foil }}>
                      {book.author_name}
                    </p>
                  )}
                </div>
                <div className="w-8 h-px mx-auto opacity-50" style={{ backgroundColor: spineStyle.palette.foil }} />
              </div>
            )}

            {/* Spine Hinge Groove Shadow (12px from left edge) */}
            <div className="absolute top-0 bottom-0 left-[11px] w-[2px] bg-black/35 pointer-events-none shadow-[0_0_4px_rgba(0,0,0,0.6)]" />

            {/* Specular Light Sheen Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: `linear-gradient(${120 + currentRotateY * 0.5}deg, rgba(255,255,255,0.4) 0%, transparent 60%)`,
              }}
            />
          </div>

          {/* =========================================================
              FACE 2: BACK COVER (rotateY 180deg, translateZ = +halfD)
              ========================================================= */}
          <div
            className="absolute inset-0 rounded-l-md overflow-hidden bg-[#181614] border border-white/20 p-5 flex flex-col justify-between text-left"
            style={{
              transform: `rotateY(180deg) translateZ(${halfD}px)`,
              backfaceVisibility: 'hidden',
              backgroundColor: spineStyle.palette.accent || '#141210',
            }}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <span className="text-[9px] font-mono tracking-widest uppercase text-white/60">
                  BBB BANGALORE · FOLIO #{spineStyle.numericSpine}
                </span>
                <span className="text-[9px] font-mono text-amber-300">
                  {latestMeetup ? `Meetup #${latestMeetup.number}` : 'Archive'}
                </span>
              </div>
              <h4 className="font-serif font-bold text-xs text-white mt-3 line-clamp-2">
                {book.title}
              </h4>
              <p className="text-[10px] text-white/60 mt-1 line-clamp-1 font-sans">
                By {book.author_name || 'Bangalore Book Club'}
              </p>
              <div className="mt-3 text-[10px] text-white/70 line-clamp-6 leading-relaxed font-serif">
                {book.description ||
                  `Archived and cataloged in the Bangalore Book Club collective reading library. Discussed with high acclaim across community gatherings.`}
              </div>
            </div>

            {/* Faux Barcode & Monogram at Bottom */}
            <div className="flex items-end justify-between pt-3 border-t border-white/10">
              <div className="flex flex-col">
                <div className="h-6 flex items-end gap-[2px] opacity-75">
                  {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 1, 2, 4].map((h, idx) => (
                    <div
                      key={idx}
                      className="bg-white"
                      style={{ width: h > 2 ? '2px' : '1px', height: `${14 + h * 2}px` }}
                    />
                  ))}
                </div>
                <span className="text-[8px] font-mono text-white/50 tracking-widest mt-1">
                  BBB-0{spineStyle.numericSpine}-IN
                </span>
              </div>
              <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-[10px] font-serif font-black text-amber-300">
                B
              </div>
            </div>
          </div>

          {/* =========================================================
              FACE 3: LEFT SPINE (width = D, rotateY = -90deg, translateX = -halfD)
              ========================================================= */}
          <div
            className="absolute top-0 bottom-0 overflow-hidden flex flex-col justify-between items-center py-3.5 select-none"
            style={{
              width: `${D}px`,
              left: `${-halfD}px`,
              transform: `rotateY(-90deg) translateZ(${halfW - halfD}px)`,
              backgroundColor: spineStyle.palette.bg,
              boxShadow: 'inset 2px 0 5px rgba(255,255,255,0.3), inset -2px 0 5px rgba(0,0,0,0.5)',
            }}
          >
            {/* Top Spine Number Pill */}
            <div className="w-5 h-5 rounded-full bg-black/85 text-white border border-white/30 flex items-center justify-center font-mono font-bold text-[8.5px] shrink-0">
              {spineStyle.numericSpine}
            </div>

            {/* Vertical Title (Criterion style: reads upwards) */}
            <div className="flex-1 my-2 flex items-center justify-center overflow-hidden">
              <span
                className="font-serif font-bold text-[10.5px] uppercase tracking-wider text-white whitespace-nowrap"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  maxHeight: '260px',
                }}
              >
                {book.title}
              </span>
            </div>

            {/* Bottom Emblem */}
            <div className="w-4 h-4 rounded-full border border-amber-300/60 flex items-center justify-center text-[8px] font-serif font-black text-amber-300 shrink-0">
              B
            </div>
          </div>

          {/* =========================================================
              FACE 4: RIGHT PAGES EDGE (width = D, rotateY = +90deg, translateX = +halfD)
              ========================================================= */}
          <div
            className="absolute top-0 bottom-0 overflow-hidden"
            style={{
              width: `${D}px`,
              right: `${-halfD}px`,
              transform: `rotateY(90deg) translateZ(${halfW - halfD}px)`,
              background: 'linear-gradient(90deg, #DDD6C7 0%, #FAF8F4 50%, #DDD6C7 100%)',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15)',
            }}
          >
            {/* Subtle Horizontal Paper Page Lines Texture */}
            <div
              className="w-full h-full opacity-35"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, #8C8270 0px, transparent 1px, transparent 3px)',
              }}
            />
          </div>

          {/* =========================================================
              FACE 5: TOP PAGES EDGE (height = D, rotateX = +90deg)
              ========================================================= */}
          <div
            className="absolute left-0 right-0 overflow-hidden"
            style={{
              height: `${D}px`,
              top: `${-halfD}px`,
              transform: `rotateX(90deg) translateZ(${halfH - halfD}px)`,
              background: 'linear-gradient(0deg, #DDD6C7 0%, #FAF8F4 50%, #DDD6C7 100%)',
            }}
          >
            <div
              className="w-full h-full opacity-35"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #8C8270 0px, transparent 1px, transparent 3px)',
              }}
            />
          </div>

          {/* =========================================================
              FACE 6: BOTTOM PAGES EDGE (height = D, rotateX = -90deg)
              ========================================================= */}
          <div
            className="absolute left-0 right-0 overflow-hidden"
            style={{
              height: `${D}px`,
              bottom: `${-halfD}px`,
              transform: `rotateX(-90deg) translateZ(${halfH - halfD}px)`,
              background: 'linear-gradient(0deg, #DDD6C7 0%, #FAF8F4 50%, #DDD6C7 100%)',
            }}
          >
            <div
              className="w-full h-full opacity-35"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #8C8270 0px, transparent 1px, transparent 3px)',
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Floating Pill Bar Directly Under the 3D Book (Exact match with cc.mp4 00:08) */}
      <div className="mt-3 flex items-center justify-between gap-3 px-4 py-2 rounded-2xl bg-black/85 border border-white/20 shadow-2xl backdrop-blur-xl w-full max-w-[340px]">
        <div className="flex items-center gap-2 truncate">
          <span className="px-2 py-0.5 rounded-full bg-white text-black font-mono font-bold text-[10px] tracking-wider shrink-0">
            #{spineStyle.numericSpine}
          </span>
          <div className="truncate">
            <span className="font-serif font-bold text-xs text-white block truncate leading-tight">
              {book.title}
            </span>
            <span className="text-[10px] text-white/50 block truncate font-sans">
              {book.author_name || 'Bangalore'} {pubYear ? `· ${pubYear}` : ''} {latestMeetup ? `· M#${latestMeetup.number}` : ''}
            </span>
          </div>
        </div>

        {/* Action icons: Heart (Pick), Share, Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onTogglePick(book)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
              isSaved
                ? 'bg-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
            }`}
            title={isSaved ? 'In your 4 closet picks' : 'Add to closet picks'}
          >
            <span className="text-xs">{isSaved ? '★' : '♡'}</span>
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}/library-room?select=${book.id}#closet`
              navigator.clipboard.writeText(url)
              onShowToast('Volume deep-link copied to clipboard!')
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition"
            title="Share volume link"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={resetAngle}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center text-[10px] font-mono transition"
            title="Reset rotation angle"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Criterion Instruction Caption (Exact match to recording 00:08) */}
      <p className="mt-2 text-[10.5px] font-mono text-white/50 text-center tracking-wide">
        Move mouse or drag to turn it · Click background to put it back
      </p>
    </div>
  )
}

/**
 * Master Criterion Inspection Stage Modal
 * Replicates the exact 3-column stage from cc.mp4:
 * [ Left: Synopsis & Metadata ]  [ Center: 3D Rotatable Book ]  [ Right: Actions & Notes ]
 */
export function CriterionDetailModal({
  book,
  allBooks,
  userPicks,
  onTogglePick,
  onClose,
  onSelectBook,
  onShowToast,
}: CriterionDetailModalProps) {
  const isSaved = userPicks.some((b) => b.id === book.id)
  const spineStyle = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])

  const [isReadMore, setIsReadMore] = React.useState(false)
  const [synopsis, setSynopsis] = React.useState<string | null>(book.description || null)
  const [pageCount, setPageCount] = React.useState<number | null>(book.page_count || null)
  const [rating, setRating] = React.useState<number | null>(book.rating || null)
  const [loadingSynopsis, setLoadingSynopsis] = React.useState(false)

  // Reset metadata when active book changes
  React.useEffect(() => {
    setIsReadMore(false)
    setPageCount(book.page_count || null)
    setRating(book.rating || null)
    setSynopsis(book.description || null)
  }, [book.id, book.description, book.page_count, book.rating])

  // Fetch synopsis and page count if missing
  React.useEffect(() => {
    let isMounted = true
    const needsSynopsis = !book.description || book.description.trim().length <= 20
    const needsPages = !book.page_count || book.page_count <= 0

    if (needsSynopsis || needsPages) {
      setLoadingSynopsis(true)
      fetchBookSynopsis(book.id)
        .then((res) => {
          if (isMounted) {
            if (res.description) setSynopsis(res.description)
            if (res.page_count) setPageCount(res.page_count)
            if (res.rating !== undefined && res.rating !== null) setRating(res.rating)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoadingSynopsis(false)
        })
    }
    return () => {
      isMounted = false
    }
  }, [book.id, book.description, book.page_count])

  // Keyboard navigation: Escape closes, Left/Right arrows navigate
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

  const currentIdx = allBooks.findIndex((b) => b.id === book.id)
  const prevBook = currentIdx > 0 ? allBooks[currentIdx - 1] : null
  const nextBook = currentIdx >= 0 && currentIdx < allBooks.length - 1 ? allBooks[currentIdx + 1] : null

  const hasCover = Boolean(book.cover_url || book.thumbnail_url)
  const coverSrc = book.cover_url || book.thumbnail_url || ''

  const publicationYear =
    book.publication_year ||
    (book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : null)

  const latestMeetup = book.meetups && book.meetups.length > 0 ? book.meetups[0] : null

  const amazonSearchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(
    `${book.title} ${book.author_name || ''}`.trim()
  )}&tag=bbbarchive-21`

  const goodreadsUrl = book.goodreads_id
    ? `https://www.goodreads.com/book/show/${book.goodreads_id}`
    : `https://www.goodreads.com/search?q=${encodeURIComponent(`${book.title} ${book.author_name || ''}`)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dark Blurred Backdrop: Clicking puts the book back on the shelf */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />

      {/* Floating Left Chevron Navigation Button */}
      {prevBook && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectBook(prevBook)
          }}
          className="fixed left-3 lg:left-6 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 shadow-2xl flex items-center justify-center transition hover:scale-110"
          title={`Previous: ${prevBook.title}`}
          aria-label="Previous volume"
        >
          <svg className="w-5 h-5 -translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Floating Right Chevron Navigation Button */}
      {nextBook && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectBook(nextBook)
          }}
          className="fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 shadow-2xl flex items-center justify-center transition hover:scale-110"
          title={`Next: ${nextBook.title}`}
          aria-label="Next volume"
        >
          <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Top Right Close Button */}
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-50 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white/70 hover:text-white border border-white/20 flex items-center justify-center transition shadow-xl"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* =========================================================================
          THE 3-COLUMN STAGE (Matching Criterion Closet cc.mp4 Frame 08)
          [ Column 1: Left Synopsis Card ]
          [ Column 2: Center Rotatable 3D Book ]
          [ Column 3: Right Actions & Notes Card ]
          ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =======================================================
            COLUMN 1 (LEFT): SYNOPSIS & METADATA CARD (Exact match)
            ======================================================= */}
        <div className="w-full lg:w-[320px] max-h-[82vh] overflow-y-auto rounded-3xl bg-[#13110E]/90 border border-white/15 p-5 sm:p-6 text-white text-left shadow-2xl backdrop-blur-xl flex flex-col justify-between scrollbar-thin order-2 lg:order-1">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/50 uppercase font-bold block mb-2">
              SYNOPSIS
            </span>
            <div className="text-xs font-serif leading-relaxed text-neutral-300">
              {loadingSynopsis ? (
                <div className="flex items-center gap-2 py-3 text-white/50 italic text-[11px]">
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading synopsis…</span>
                </div>
              ) : synopsis ? (
                <div>
                  <p>
                    {isReadMore || synopsis.length <= 260 ? synopsis : `${synopsis.slice(0, 260)}…`}
                  </p>
                  {synopsis.length > 260 && (
                    <button
                      onClick={() => setIsReadMore(!isReadMore)}
                      className="mt-2 text-amber-300 hover:text-amber-200 underline font-sans text-[11px] block cursor-pointer"
                    >
                      {isReadMore ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="italic text-neutral-400">
                  Featured volume in the Bangalore Book Club permanent archive.
                </p>
              )}
            </div>

            {/* Criterion Key-Value Metadata Table */}
            <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">YEAR</span>
                <span className="font-mono text-white/90">{publicationYear || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">LENGTH</span>
                <span className="font-mono text-white/90">
                  {pageCount || book.page_count ? `${pageCount || book.page_count} pages` : 'Standard edition'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">MEETUP</span>
                <span className="font-mono text-amber-300">
                  {latestMeetup ? `Meetup #${latestMeetup.number}` : 'Archive'}
                </span>
              </div>
              {latestMeetup?.venue && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">VENUE</span>
                  <span className="font-sans text-white/80 text-[11px] truncate max-w-[170px]">
                    {latestMeetup.venue}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">DISCUSSIONS</span>
                <span className="font-mono text-white/90">
                  {book.discussion_count} {book.discussion_count === 1 ? 'Meetup' : 'Meetups'}
                </span>
              </div>
              {(rating || book.rating) && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">RATING</span>
                  <span className="font-mono text-amber-400 font-bold">
                    ★ {Number(rating || book.rating).toFixed(1)} / 5.0
                  </span>
                </div>
              )}
            </div>

            {/* PICKED BY BBB MEMBERS Section (Avatars matching cc.mp4 00:08) */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase block mb-2.5">
                DISCUSSED BY BBB MEMBERS
              </span>
              {book.members && book.members.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {book.members.map((mem, idx) => {
                    const initials =
                      mem.display_name
                        .split(' ')
                        .map((p) => p[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'R'
                    return (
                      <Link
                        key={mem.id || idx}
                        href={`/members/${mem.id}`}
                        className="group/mem flex flex-col items-center flex-shrink-0"
                        title={mem.display_name}
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-800 text-amber-200 border border-white/30 flex items-center justify-center text-[10px] font-bold font-serif group-hover/mem:scale-110 transition-transform">
                          {initials}
                        </div>
                        <span className="mt-1 text-[9px] text-white/70 group-hover/mem:text-white truncate max-w-[50px]">
                          {mem.display_name.split(' ')[0]}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-white/60 font-serif">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-amber-300 flex items-center justify-center font-bold text-[9px]">
                    B
                  </div>
                  <span>Bangalore Book Club Community</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[9px] font-mono text-white/35">
            SPINE NO. {spineStyle.numericSpine}
          </div>
        </div>

        {/* =======================================================
            COLUMN 2 (CENTER): ROTATABLE 3D BOOK
            ======================================================= */}
        <div className="w-full lg:w-[380px] flex items-center justify-center order-1 lg:order-2">
          <Rotatable3DBook
            book={book}
            spineStyle={spineStyle}
            coverSrc={coverSrc}
            hasCover={hasCover}
            isSaved={isSaved}
            onTogglePick={onTogglePick}
            onShowToast={onShowToast}
            onClose={onClose}
          />
        </div>

        {/* =======================================================
            COLUMN 3 (RIGHT): ACTIONS, GOODREADS, PICKS & NOTES
            ======================================================= */}
        <div className="w-full lg:w-[320px] max-h-[82vh] overflow-y-auto rounded-3xl bg-[#13110E]/90 border border-white/15 p-5 sm:p-6 text-white text-left shadow-2xl backdrop-blur-xl flex flex-col justify-between scrollbar-thin order-3">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/50 uppercase font-bold block mb-3">
              ARCHIVE & ACTIONS
            </span>

            {/* Primary Action Button 1: View Meetup Archive */}
            <Link
              href={latestMeetup ? `/meetups/${latestMeetup.id}` : '/meetups'}
              className="w-full bg-[#FAF5EA] hover:bg-white text-black font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition mb-2"
            >
              <span>{latestMeetup ? `Meetup #${latestMeetup.number} Notes` : 'Meetups Archive'}</span>
              <span className="opacity-60">→</span>
            </Link>

            {/* Action Button 2: Full Archival Record */}
            <Link
              href={`/books/${book.id}`}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition mb-4"
            >
              <span>Examine Book Dossier</span>
              <span className="opacity-60">↗</span>
            </Link>

            {/* GET IT Section */}
            <div className="pt-3 border-t border-white/10 mb-4">
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 block mb-2">
                GET IT
              </span>
              <a
                href={amazonSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-between transition mb-2"
              >
                <span>Buy on Amazon India</span>
                <span className="text-amber-300 text-[10px]">↗</span>
              </a>
              <a
                href={goodreadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-between transition"
              >
                <span>View on Goodreads</span>
                <span className="text-white/40 text-[10px]">↗</span>
              </a>
            </div>

            {/* ADD TO A LIST / CLOSET PICKS */}
            <div className="pt-3 border-t border-white/10 mb-4">
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 block mb-2">
                CLOSET PICKS ({userPicks.length}/4)
              </span>
              <button
                onClick={() => onTogglePick(book)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  isSaved
                    ? 'bg-amber-500 text-black shadow-lg font-bold'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                }`}
              >
                <span>{isSaved ? '✓ Added to your 4 picks' : '+ Add to your closet picks'}</span>
              </button>
            </div>

            {/* MEETUPS TIMELINE */}
            {book.meetups && book.meetups.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 block mb-2">
                  DISCUSSED AT MEETUPS
                </span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                  {book.meetups.map((m) => (
                    <div
                      key={m.id || m.number}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 text-[11px]"
                    >
                      <span className="font-mono text-amber-300 font-bold">Meetup #{m.number}</span>
                      <span className="text-white/50 text-[10px] truncate max-w-[130px]">
                        {m.venue || m.date || 'Bangalore'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[9px] font-mono text-white/35 flex items-center justify-between">
            <span>BANGALORE BOOK CLUB</span>
            <span className="text-amber-400/60">BBB CRITERION ARCHIVE</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
