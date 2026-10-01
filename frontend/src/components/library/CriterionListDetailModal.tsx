'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { fetchBookSynopsis, type Book } from '@/lib/api'
import { getBookSpineStyle } from './CriterionBookCloset'

interface CriterionListDetailModalProps {
  book: Book
  allBooks: Book[]
  userPicks: Book[]
  onTogglePick: (book: Book) => void
  onClose: () => void
  onSelectBook: (book: Book) => void
  onShowToast: (msg: string) => void
}

/**
 * CriterionListDetailModal
 * 
 * Replicates the exact Criterion Closet website List View modal
 * from Screenshot 2026-10-01 201506.png & Screenshot 2026-10-01 201512.png:
 * - Centered clean white card with rounded-3xl corners
 * - Top-right circular close button
 * - Centered front cover with soft drop-shadow
 * - Large bold Spine # (e.g. #5)
 * - Large Book Title & Subtitle (Year · Author)
 * - Category / Meta pills (Meetup #, Genre, Brought by Reader, Venue)
 * - Action buttons: [ ♡ Add to Picks ] [ Share book ]
 * - Formatted Synopsis with [ Read more ] toggle
 * - WATCH / DISCUSSIONS section with primary dark button [ View Full Book Dossier → ]
 * - GET / DETAILS pills: [ Standard edition ] [ Page count ] [ Rating ]
 * - DISCUSSED BY BBB READERS: horizontal avatar list of readers who brought or discussed it
 */
export function CriterionListDetailModal({
  book,
  allBooks,
  userPicks,
  onTogglePick,
  onClose,
  onSelectBook,
  onShowToast,
}: CriterionListDetailModalProps) {
  const isSaved = userPicks.some((b) => b.id === book.id)
  const spineStyle = React.useMemo(() => getBookSpineStyle(book.title, book.id), [book.title, book.id])

  const [isReadMore, setIsReadMore] = React.useState(false)
  const [synopsis, setSynopsis] = React.useState<string | null>(book.description || null)
  const [pageCount, setPageCount] = React.useState<number | null>(book.page_count || null)
  const [rating, setRating] = React.useState<number | null>(book.rating || null)
  const [loadingSynopsis, setLoadingSynopsis] = React.useState(false)
  const [coverUrl, setCoverUrl] = React.useState<string | null>(
    book.cover_url && !book.cover_url.includes('nophoto') ? book.cover_url : book.thumbnail_url || null
  )

  // Reset metadata when active book changes
  React.useEffect(() => {
    setIsReadMore(false)
    setPageCount(book.page_count || null)
    setRating(book.rating || null)
    setSynopsis(book.description || null)
    const initialCover =
      book.cover_url && !book.cover_url.includes('nophoto') ? book.cover_url : book.thumbnail_url || null
    setCoverUrl(initialCover)
  }, [book.id, book.description, book.page_count, book.rating, book.cover_url, book.thumbnail_url])

  // Fetch synopsis and metadata/cover if missing
  React.useEffect(() => {
    let isCancelled = false
    const needsSynopsis = !book.description
    const needsCover = !book.cover_url || book.cover_url.includes('nophoto')

    if (needsSynopsis || needsCover) {
      setLoadingSynopsis(true)
      fetchBookSynopsis(book.id)
        .then((res) => {
          if (isCancelled) return
          if (res.description) setSynopsis(res.description)
          if (res.page_count) setPageCount(res.page_count)
          if (res.rating !== undefined && res.rating !== null) setRating(res.rating)
          if (res.cover_url && !res.cover_url.includes('nophoto')) setCoverUrl(res.cover_url)
        })
        .catch(() => {})
        .finally(() => {
          if (!isCancelled) setLoadingSynopsis(false)
        })
    }
    return () => {
      isCancelled = true
    }
  }, [book.id, book.description, book.cover_url])

  // Scroll to top whenever modal opens or book changes
  const modalScrollRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0
    }
  }, [book.id])

  // Keyboard navigation: Escape to close, Left/Right arrow to switch books
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        const curIdx = allBooks.findIndex((b) => b.id === book.id)
        if (curIdx > 0) onSelectBook(allBooks[curIdx - 1])
      } else if (e.key === 'ArrowRight') {
        const curIdx = allBooks.findIndex((b) => b.id === book.id)
        if (curIdx >= 0 && curIdx < allBooks.length - 1) onSelectBook(allBooks[curIdx + 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [book.id, allBooks, onClose, onSelectBook])

  const currentIndex = allBooks.findIndex((b) => b.id === book.id)
  const prevBook = currentIndex > 0 ? allBooks[currentIndex - 1] : null
  const nextBook = currentIndex >= 0 && currentIndex < allBooks.length - 1 ? allBooks[currentIndex + 1] : null

  const coverSrc = coverUrl || ''
  const hasCover = Boolean(coverUrl)
  const latestMeetup = book.meetups && book.meetups.length > 0 ? book.meetups[0] : null
  const pubYear =
    book.publication_year ||
    (book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : null)

  const handleShare = () => {
    const url = `${window.location.origin}/library-room?select=${book.id}#list`
    navigator.clipboard.writeText(url)
    onShowToast('Book link copied to clipboard!')
  }

  return (
    <div
      ref={modalScrollRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Darkened backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/65 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Floating Prev Book Arrow */}
      {prevBook && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectBook(prevBook)
          }}
          className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-xl flex items-center justify-center transition hover:scale-110 border border-neutral-200"
          title={`Previous: ${prevBook.title}`}
          aria-label="Previous volume"
        >
          <svg className="w-5 h-5 -translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Floating Next Book Arrow */}
      {nextBook && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectBook(nextBook)
          }}
          className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-xl flex items-center justify-center transition hover:scale-110 border border-neutral-200"
          title={`Next: ${nextBook.title}`}
          aria-label="Next volume"
        >
          <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* =========================================================================
          THE CRITERION LIST VIEW WHITE CARD MODAL
          Matches Screenshot 2026-10-01 201506.png & 201512.png
          ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative z-10 w-full max-w-[480px] bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-neutral-200/80 my-4 text-center max-h-[92vh] overflow-y-auto scrollbar-thin text-[#14130F]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Circular Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* =======================================================
            1. CENTERED BOOK COVER WITH SOFT SHADOW (Screenshot 1)
            ======================================================= */}
        <div className="relative mx-auto mt-1 mb-4 w-40 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-neutral-200/70 bg-[#1A1816] group">
          {hasCover ? (
            <img
              src={coverSrc}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          ) : (
            /* Fallback cloth texture */
            <div
              className="w-full h-full p-4 flex flex-col justify-between text-center relative"
              style={{ backgroundColor: spineStyle.palette.bg }}
            >
              <div className="w-6 h-px mx-auto opacity-50" style={{ backgroundColor: spineStyle.palette.foil }} />
              <div>
                <span
                  className="text-[9px] font-mono tracking-widest uppercase opacity-80 block"
                  style={{ color: spineStyle.palette.foil }}
                >
                  SPINE {spineStyle.numericSpine}
                </span>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-white mt-2 leading-snug line-clamp-3">
                  {book.title}
                </h4>
                {book.author_name && (
                  <p className="text-[10px] font-sans mt-1 tracking-wide" style={{ color: spineStyle.palette.foil }}>
                    {book.author_name}
                  </p>
                )}
              </div>
              <div className="w-6 h-px mx-auto opacity-50" style={{ backgroundColor: spineStyle.palette.foil }} />
            </div>
          )}

          {/* Criterion / BBB Monogram Badge in top left corner of cover */}
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[9px] font-serif font-bold text-white shadow-sm pointer-events-none">
            B
          </div>
        </div>

        {/* =======================================================
            2. SPINE #, TITLE & SUBHEAD (Screenshot 1)
            ======================================================= */}
        <div className="space-y-1">
          <span className="font-black text-3xl sm:text-4xl text-[#14130F] font-mono tracking-tight block">
            #{spineStyle.numericSpine}
          </span>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#14130F] leading-tight">
            {book.title}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium">
            {pubYear ? `${pubYear} · ` : ''}{book.author_name || 'Bangalore Book Club'}
          </p>
        </div>

        {/* =======================================================
            3. CATEGORY & METADATA PILLS (Screenshot 1)
            ======================================================= */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5 mb-4">
          {latestMeetup && (
            <span className="px-3 py-1 rounded-full bg-[#F4EFEA] text-neutral-800 text-xs font-medium">
              Meetup #{latestMeetup.number}
            </span>
          )}
          {book.members && book.members.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-[#F4EFEA] text-neutral-800 text-xs font-medium">
              Brought by {book.members[0].display_name}
            </span>
          )}
          {latestMeetup?.venue && (
            <span className="px-3 py-1 rounded-full bg-[#F4EFEA] text-neutral-800 text-xs font-medium truncate max-w-[180px]">
              {latestMeetup.venue}
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-[#F4EFEA] text-neutral-800 text-xs font-medium">
            {book.discussion_count} {book.discussion_count === 1 ? 'Discussion' : 'Discussions'}
          </span>
        </div>

        {/* =======================================================
            4. ACTION BUTTONS: [ ♡ Add to Picks ] [ Share book ] (Screenshot 1)
            ======================================================= */}
        <div className="flex items-center gap-2.5 mt-2 mb-4">
          <button
            onClick={() => onTogglePick(book)}
            className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              isSaved
                ? 'bg-amber-400 border-amber-500 text-black shadow-sm font-bold'
                : 'bg-[#F7F4EE] hover:bg-[#EFEAE2] border-[#DDD5C7] text-neutral-800'
            }`}
          >
            <span>{isSaved ? '★' : '♡'}</span>
            <span>{isSaved ? 'In Picks' : 'Add to Picks'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#F7F4EE] hover:bg-[#EFEAE2] border border-[#DDD5C7] text-neutral-800 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share book</span>
          </button>
        </div>

        {/* =======================================================
            5. SYNOPSIS WITH [ Read more ] (Screenshot 1 & 2)
            ======================================================= */}
        <div className="text-left text-xs sm:text-sm text-neutral-700 leading-relaxed font-serif pt-1 border-t border-neutral-150">
          {loadingSynopsis ? (
            <div className="flex items-center gap-2 py-3 text-neutral-400 italic text-xs">
              <div className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              <span>Fetching synopsis from archive…</span>
            </div>
          ) : synopsis ? (
            <div>
              <p>
                {isReadMore || synopsis.length <= 250 ? synopsis : `${synopsis.slice(0, 250)}…`}
              </p>
              {synopsis.length > 250 && (
                <button
                  onClick={() => setIsReadMore(!isReadMore)}
                  className="mt-1.5 font-sans font-bold text-xs text-neutral-900 underline block cursor-pointer"
                >
                  {isReadMore ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          ) : (
            <p className="italic text-neutral-500 py-1">
              Volume from the Bangalore Book Club collection.
            </p>
          )}
        </div>

        {/* =======================================================
            6. WATCH / DISCUSSIONS SECTION (Screenshot 2)
            ======================================================= */}
        <div className="mt-5 pt-4 border-t border-neutral-150 text-left">
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase font-bold block mb-2">
            WATCH & EXPLORE
          </span>

          <Link
            href={`/books/${book.id}`}
            className="w-full py-3 rounded-xl bg-[#14130F] hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
          >
            <span>View Full Book Dossier</span>
            <span>→</span>
          </Link>

          {latestMeetup && (
            <Link
              href={`/meetups/${latestMeetup.id || latestMeetup.number}`}
              className="w-full py-2.5 mt-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE8] border border-[#DDD5C7] text-neutral-800 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>Explore Meetup #{latestMeetup.number} Discussion</span>
              <span className="text-neutral-400">↗</span>
            </Link>
          )}
        </div>

        {/* =======================================================
            7. GET / EDITIONS & DETAILS (Screenshot 2)
            ======================================================= */}
        <div className="mt-4 pt-3 border-t border-neutral-150 text-left">
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase font-bold block mb-2">
            GET & DETAILS
          </span>

          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <span className="px-3 py-1 rounded-full bg-[#14130F] text-white text-[11px] font-medium">
              Standard edition
            </span>
            {(pageCount || book.page_count) && (
              <span className="px-3 py-1 rounded-full bg-[#F4EFEA] text-neutral-700 text-[11px] font-medium">
                {pageCount || book.page_count} pages
              </span>
            )}
            {(rating || book.rating) && (
              <span className="px-3 py-1 rounded-full bg-[#F4EFEA] text-neutral-700 text-[11px] font-medium">
                ★ {rating || book.rating} / 5
              </span>
            )}
          </div>

          <a
            href={
              book.goodreads_id
                ? `https://www.goodreads.com/book/show/${book.goodreads_id}`
                : `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + (book.author_name || ''))}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition flex items-center justify-center gap-1.5"
          >
            <span>Search on Goodreads</span>
            <span className="text-neutral-400 text-[10px]">↗</span>
          </a>
        </div>

        {/* =======================================================
            8. DISCUSSED BY BBB READERS (Screenshot 2 - Picked by Guests)
            ======================================================= */}
        {book.members && book.members.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-150 text-left">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase font-bold block mb-2.5">
              DISCUSSED BY BBB READERS
            </span>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {book.members.map((member) => {
                const initials = member.display_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <Link
                    key={`reader-${member.id}`}
                    href={`/members/${member.id}`}
                    className="group flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl hover:bg-neutral-100 transition"
                    title={`View ${member.display_name}'s Dossier`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#14130F] text-amber-200 border-2 border-neutral-200 group-hover:border-amber-500 font-serif font-bold text-xs flex items-center justify-center shadow-sm transition">
                      {initials}
                    </div>
                    <span className="text-[10px] font-medium text-neutral-700 group-hover:text-black truncate max-w-[64px] text-center">
                      {member.display_name.split(' ')[0]}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
