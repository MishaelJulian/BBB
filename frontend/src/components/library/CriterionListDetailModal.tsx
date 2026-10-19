'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { fetchBookSynopsis, type Book } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import { useMe } from '@/components/club/useMe'
import { getBookSpineStyle } from './CriterionBookCloset'
import { Rotatable3DBook } from './CriterionDetailModal'

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
 * - Centered front cover with soft drop-shadow-sm
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
  const me = useMe()
  const canSee = me.state === 'member' || me.state === 'admin'
  // How many other members picked this book: a count only. An admin also gets the names.
  const [others, setOthers] = React.useState<number | null>(null)
  const [readers, setReaders] = React.useState<{ id: string; display_name: string; tag: string }[] | null>(null)
  React.useEffect(() => {
    setOthers(null)
    setReaders(null)
    if (!canSee) return
    let dead = false
    void authFetch(`/api/me/picks?book=${encodeURIComponent(book.id)}`)
      .then(async (r) => {
        if (!r.ok || dead) return
        const j = await r.json()
        setOthers(j.others ?? 0)
        setReaders(j.readers ?? null)
      })
      .catch(() => {})
    return () => { dead = true }
  }, [book.id, canSee, isSaved])
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
      className="fixed inset-0 z-50 overflow-y-auto bg-[#faf8f5]"
    >
      {/* Darkened backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/65 "
        onClick={onClose}
      />

      {/* Floating Prev Book Arrow */}
      {prevBook && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectBook(prevBook)
          }}
          className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-11 sm:h-11 bg-paper hover:bg-paper-dark text-ink flex items-center justify-center border border-border-dark"
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
          className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-11 sm:h-11 bg-paper hover:bg-paper-dark text-ink flex items-center justify-center border border-border-dark"
          title={`Next: ${nextBook.title}`}
          aria-label="Next volume"
        >
          <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Editorial panel: flat, left-aligned, no capsule tags, one hard-offset primary button (docs/ux/ADR-ui-revamp.md section 5) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 w-full max-w-3xl mx-auto min-h-full bg-paper p-4 pb-16 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fixed top-0 inset-x-0 z-[70] h-14 bg-[#070709] border-b border-white/30 flex items-center px-2">
          <button onClick={onClose} aria-label="Close book view" className="min-h-14 px-3 inline-flex items-center gap-2 text-paper text-xl font-bold uppercase tracking-widest">
            <span aria-hidden="true" className="text-3xl leading-none font-normal">&lsaquo;</span>
            <span className="underline decoration-[3px] underline-offset-[8px]">Close</span>
          </button>
        </div>

        <div className="-mx-4 -mt-4 mb-5 bg-[#070709] pt-20 pb-4 flex flex-col items-center">
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
          <button type="button" onClick={() => document.getElementById('book-details')?.scrollIntoView({ behavior: 'smooth' })} className="mt-4 min-h-12 px-4 text-paper text-lg font-semibold underline decoration-2 underline-offset-[6px]">
            Synopsis and details <span aria-hidden="true">&darr;</span>
          </button>
        </div>

        <div id="book-details" className="flex gap-5 items-start scroll-mt-20">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted">Spine {spineStyle.numericSpine}</p>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{book.title}</h2>
            <p className="mt-1 text-sm text-ink-light">
              {pubYear ? `${pubYear} · ` : ''}
              {book.author_name || 'Bangalore Book Club'}
            </p>
            <p className="mt-3 text-sm text-ink-light">
              {[
                latestMeetup ? `Meetup #${latestMeetup.number}` : null,
                book.members && book.members.length > 0 ? `brought by ${book.members[0].display_name}` : null,
                latestMeetup?.venue || null,
                `${book.discussion_count} ${book.discussion_count === 1 ? 'discussion' : 'discussions'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={`/books/${book.id}`}
            className="inline-block bg-ink text-paper text-base font-semibold px-5 py-3 rounded-[2px] shadow-[3px_3px_0_0_var(--color-accent)] transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Open the book page
          </Link>
          <button onClick={() => onTogglePick(book)} className="min-h-9 text-sm underline underline-offset-4 hover:text-accent">
            {isSaved ? 'Remove from picks' : 'Add to picks'}
          </button>
          <button onClick={handleShare} className="min-h-9 text-sm underline underline-offset-4 hover:text-accent">
            Share
          </button>
        </div>
        {others !== null && (
          <p className="mt-3 text-sm text-ink-light" data-testid="picked-by">
            {others === 0 ? 'No one else has picked this yet.' : `${others} ${others === 1 ? 'other has' : 'others have'} also picked this.`}
            {readers && readers.length > 0 && (
              <span className="block mt-1">Picked by: {readers.map((x) => `${x.display_name} (${x.tag})`).join(', ')}</span>
            )}
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-border text-base text-ink-light leading-relaxed">
          {loadingSynopsis ? (
            <p className="text-muted">Fetching the synopsis from the archive…</p>
          ) : synopsis ? (
            <div>
              <p>{isReadMore || synopsis.length <= 250 ? synopsis : `${synopsis.slice(0, 250)}…`}</p>
              {synopsis.length > 250 && (
                <button onClick={() => setIsReadMore(!isReadMore)} className="mt-1 min-h-9 text-sm underline underline-offset-4 hover:text-accent">
                  {isReadMore ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-muted">Volume from the Bangalore Book Club collection.</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border text-sm text-ink-light">
          <p>
            {[
              (pageCount || book.page_count) ? `${pageCount || book.page_count} pages` : null,
              (rating || book.rating) ? `rated ${rating || book.rating} of 5` : null,
              'standard edition',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {latestMeetup && (
              <Link href={`/meetups/${latestMeetup.id || latestMeetup.number}`} className="font-semibold text-[#8a1c1c] underline decoration-2 underline-offset-4 hover:text-[#5e1010]">
                Meetup #{latestMeetup.number} discussion
              </Link>
            )}
            <a
              href={
                book.goodreads_id
                  ? `https://www.goodreads.com/book/show/${book.goodreads_id}`
                  : `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + (book.author_name || ''))}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#8a1c1c] underline decoration-2 underline-offset-4 hover:text-[#5e1010]"
            >
              Search on Goodreads
            </a>
          </p>
        </div>

        {book.members && book.members.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-ink">Discussed by</h3>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {book.members.map((member) => (
                <li key={`reader-${member.id}`}>
                  <Link href={`/members/${member.id}`} className="font-semibold text-[#8a1c1c] underline decoration-2 underline-offset-4 hover:text-[#5e1010]">
                    {member.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  )
}
