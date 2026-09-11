'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShelfBay } from '@/components/library/ShelfBay'
import { HeroBookModal } from '@/components/library/HeroBookModal'
import { AlphabetNav } from '@/components/library/AlphabetNav'
import { AmbientLighting, LightingToggle, type LightingMode } from '@/components/library/AmbientLighting'
import { ClosetPicksTray } from '@/components/library/ClosetPicksTray'
import { ErrorState } from '@/components/shared/ErrorState'
import { fetchBooks } from '@/lib/api'
import type { Book } from '@/lib/api'

// Featured shelf configurations
const FEATURED_SHELVES = [
  { id: 'bay-most-discussed', title: 'Most Discussed Volumes', subtitle: 'The foundational pillars of BBB conversations', sortBy: 'discussionCount', sortOrder: 'desc' as const },
  { id: 'bay-recent-reads', title: 'Recent BBB Gatherings', subtitle: 'Freshly discussed in Bangalore book meetups', sortBy: 'lastDiscussedYear', sortOrder: 'desc' as const },
  { id: 'bay-classics', title: 'Archival Classics & Foundations', subtitle: 'Timeless literature revisited through the years', filter: 'classic' },
  { id: 'bay-indian', title: 'Bangalore & Indian Literature', subtitle: 'Regional voices, translations and local narratives', filter: 'indian' },
]

const CLASSIC_KEYWORDS = ['pratchett', 'morrison', 'atwood', 'dostoevsky', 'tolkien', 'asimov', 'clarke', 'orwell', 'kafka', 'calvino', 'borges', 'hemingway', 'woolf', 'camus']
const INDIAN_KEYWORDS = ['roy', 'shankar', 'adhikari', 'murugan', 'lahiri', 'chakraborty', 'tagore', 'karnad', 'anand', 'seth', 'ghosh', 'tharoor', 'narayan', 'bandyopadhyay']

interface HoveredBookMeta {
  id: string
  title: string
  author?: string
  catalogNo: string
  discussionCount: number
}

export function VirtualLibraryRoom() {
  const searchParams = useSearchParams()
  const selectParam = searchParams.get('select')

  const [books, setBooks] = React.useState<Book[]>([])
  const [selectedBookId, setSelectedBookId] = React.useState<string | null>(null)
  const [highlightedBookId, setHighlightedBookId] = React.useState<string | null>(null)
  const [hoveredBookMeta, setHoveredBookMeta] = React.useState<HoveredBookMeta | null>(null)
  const [lightingMode, setLightingMode] = React.useState<LightingMode>('afternoon')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeSection, setActiveSection] = React.useState('A')
  const [activeBayFilter, setActiveBayFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [libraryBag, setLibraryBag] = React.useState<Book[]>([])
  const [isBagOpen, setIsBagOpen] = React.useState(false)

  // Room Parallax with damped spring physics
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { stiffness: 60, damping: 25, mass: 1 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // Subtle room camera tilt
  const roomRotateY = useTransform(smoothX, [-0.5, 0.5], [-2, 2])
  const roomRotateX = useTransform(smoothY, [-0.5, 0.5], [1.5, -1.5])
  const roomTranslateX = useTransform(smoothX, [-0.5, 0.5], [-12, 12])

  // Load books
  React.useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchBooks({ limit: 3000 })
        setBooks(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library collection')
      } finally {
        setLoading(false)
      }
    }
    loadBooks()
  }, [])

  // Deep-linking: ?select=<book_id>
  React.useEffect(() => {
    if (!selectParam || books.length === 0) return

    const targetBook = books.find((b) => b.id === selectParam)
    if (targetBook) {
      setSelectedBookId(targetBook.id)
      const firstChar = targetBook.title.charAt(0).toUpperCase()
      const section = /[A-Z]/.test(firstChar) ? firstChar : '#'
      setActiveSection(section)

      const timer = setTimeout(() => {
        const shelfElem = document.getElementById(`bay-section-${section}`) || document.getElementById(`section-${section}`)
        if (shelfElem) {
          shelfElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [selectParam, books])

  // Mouse move handler for room parallax
  const handleRoomMouseMove = (e: React.MouseEvent) => {
    if (selectedBookId) return
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    mouseX.set(clientX / innerWidth - 0.5)
    mouseY.set(clientY / innerHeight - 0.5)
  }

  // Book Selection handler
  const handleSelectBook = React.useCallback((bookId: string) => {
    setSelectedBookId((prev) => (prev === bookId ? null : bookId))
  }, [])

  const handleCloseHero = React.useCallback(() => {
    setSelectedBookId(null)
  }, [])

  // Currently active Book object
  const activeBook = React.useMemo(() => {
    if (!selectedBookId) return null
    return books.find((b) => b.id === selectedBookId) || null
  }, [books, selectedBookId])

  // Group books alphabetically
  const groupedBooks = React.useMemo(() => {
    const groups: Record<string, Book[]> = {}
    books.forEach((book) => {
      const firstChar = book.title.charAt(0).toUpperCase()
      const section = /[A-Z]/.test(firstChar) ? firstChar : '#'
      if (!groups[section]) groups[section] = []
      groups[section].push(book)
    })
    return groups
  }, [books])

  const sections = React.useMemo(() => {
    return Object.keys(groupedBooks).sort()
  }, [groupedBooks])

  // Featured Shelves
  const featuredShelves = React.useMemo(() => {
    return FEATURED_SHELVES.map((config, idx) => {
      let shelfBooks = [...books]

      if (config.filter === 'classic') {
        shelfBooks = shelfBooks.filter((b) =>
          CLASSIC_KEYWORDS.some((kw) => b.author_name?.toLowerCase().includes(kw))
        )
      } else if (config.filter === 'indian') {
        shelfBooks = shelfBooks.filter((b) =>
          INDIAN_KEYWORDS.some((kw) => b.author_name?.toLowerCase().includes(kw))
        )
      } else if (config.sortBy) {
        shelfBooks.sort((a, b) => {
          const aVal = config.sortBy === 'discussionCount' ? a.discussion_count : 0
          const bVal = config.sortBy === 'discussionCount' ? b.discussion_count : 0
          return config.sortOrder === 'desc' ? bVal - aVal : aVal - bVal
        })
      }

      return {
        id: config.id,
        shelfNumber: idx + 1,
        title: config.title,
        subtitle: config.subtitle,
        books: shelfBooks.slice(0, 48),
      }
    })
  }, [books])

  // Shelf books for active hero book
  const activeShelfBooks = React.useMemo(() => {
    if (!activeBook) return []
    const firstChar = activeBook.title.charAt(0).toUpperCase()
    const section = /[A-Z]/.test(firstChar) ? firstChar : '#'
    return groupedBooks[section] || books
  }, [activeBook, groupedBooks, books])

  // Scroll to section
  const scrollToSection = (section: string) => {
    setActiveSection(section)
    const element = document.getElementById(`bay-section-${section}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // "Surprise Me / Random Pick" action
  const handleSurpriseMe = () => {
    if (books.length === 0) return
    const randomIdx = Math.floor(Math.random() * books.length)
    const randomBook = books[randomIdx]
    if (randomBook) {
      setHighlightedBookId(randomBook.id)
      const firstChar = randomBook.title.charAt(0).toUpperCase()
      const section = /[A-Z]/.test(firstChar) ? firstChar : '#'
      setActiveSection(section)

      const targetEl = document.getElementById(`bay-section-${section}`)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      setTimeout(() => {
        setSelectedBookId(randomBook.id)
      }, 400)
    }
  }

  // Library Bag actions
  const handleToggleBag = (book: Book) => {
    setLibraryBag((prev) => {
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

  const handleRemoveFromBag = (bookId: string) => {
    setLibraryBag((prev) => prev.filter((b) => b.id !== bookId))
  }

  return (
    <div
      className="relative min-h-screen bg-[#0A0806] text-[#F3EFE6] overflow-x-hidden selection:bg-amber-600 selection:text-white"
      onMouseMove={handleRoomMouseMove}
      style={{ perspective: '1600px' }}
    >
      {/* Dynamic Ambient Environmental Room Lighting */}
      <AmbientLighting mode={lightingMode} />

      {/* Floor-to-Ceiling Library Room Wallpaper & Architectural Wainscoting Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-35"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 95% 85% at 50% 20%, rgba(255, 225, 170, 0.07) 0%, transparent 65%),
            linear-gradient(90deg, rgba(0,0,0,0.65) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.65) 100%),
            repeating-linear-gradient(90deg, transparent, transparent 120px, rgba(255,255,255,0.01) 120px, rgba(255,255,255,0.01) 121px)
          `,
        }}
      />

      {/* Floating Library Room Archival Header */}
      <header className="sticky top-0 z-40 bg-[#120D0A]/90 border-b border-amber-950/40 backdrop-blur-2xl transition-all duration-300 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Room Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-display text-sm sm:text-base font-bold tracking-wider text-[#FAF6EE] hover:text-amber-300 uppercase transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.9)] animate-pulse" />
              <span>The Library Room</span>
            </Link>
            <span className="hidden md:inline text-[11px] text-amber-200/50 font-mono tracking-widest uppercase">
              · Broke Bibliophiles of Bangalore
            </span>
          </div>

          {/* Quick Controls: Search, Surprise Me, Library Bag, Lighting Mode */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial justify-end">
            {/* Quick Search */}
            <div className="relative w-36 sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collection…"
                suppressHydrationWarning
                className="w-full pl-7 pr-3 py-1.5 rounded-full bg-black/50 border border-amber-900/40 text-xs text-paper placeholder-white/40 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 transition-all font-sans"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-300/50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  suppressHydrationWarning
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Surprise Me & Library Bag */}
            <ClosetPicksTray
              picks={libraryBag}
              onRemovePick={handleRemoveFromBag}
              onSelectPick={handleSelectBook}
              onSurpriseMe={handleSurpriseMe}
              isOpen={isBagOpen}
              onToggleOpen={() => setIsBagOpen(!isBagOpen)}
            />

            {/* Atmosphere Lighting Toggle */}
            <div className="hidden sm:block">
              <LightingToggle mode={lightingMode} onModeChange={setLightingMode} />
            </div>

            {/* Standard Catalog Grid Link */}
            <Link
              href="/library"
              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition-all font-sans shrink-0 hidden lg:inline-block"
            >
              Grid View
            </Link>
          </div>
        </div>

        {/* Minimal Floating A–Z Catalog Index Bar */}
        <div className="border-t border-amber-950/30 px-2 py-1 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <AlphabetNav
              sections={sections}
              activeSection={activeSection}
              onSectionClick={scrollToSection}
            />

            {/* Quick Bay Filter Tabs */}
            <div className="hidden xl:flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveBayFilter('all')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider transition-all ${
                  activeBayFilter === 'all'
                    ? 'bg-amber-600/80 text-white font-bold'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                All Bays
              </button>
              <button
                onClick={() => setActiveBayFilter('featured')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider transition-all ${
                  activeBayFilter === 'featured'
                    ? 'bg-amber-600/80 text-white font-bold'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Curated
              </button>
              <button
                onClick={() => setActiveBayFilter('catalog')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider transition-all ${
                  activeBayFilter === 'catalog'
                    ? 'bg-amber-600/80 text-white font-bold'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                A–Z Stacks
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Floor-to-Ceiling Virtual Library Stacks with Spatial Parallax */}
      <motion.main
        className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-6 transition-all duration-500"
        style={{
          rotateY: roomRotateY,
          rotateX: roomRotateX,
          x: roomTranslateX,
          filter: selectedBookId ? 'blur(16px) brightness(0.28) contrast(0.95)' : 'none',
          pointerEvents: selectedBookId ? 'none' : 'auto',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Loading State */}
        {loading && (
          <div className="py-32 text-center space-y-4">
            <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-serif text-xs text-amber-200/70 uppercase tracking-widest">
              Assembling physical archive stacks…
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-16 max-w-md mx-auto">
            <ErrorState message={error} onRetry={() => window.location.reload()} />
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-10">
            {/* Curated Featured Bays */}
            {(activeBayFilter === 'all' || activeBayFilter === 'featured') && (
              <section className="space-y-8">
                {featuredShelves.map((shelf) => (
                  <ShelfBay
                    key={shelf.id}
                    bayId={shelf.id}
                    shelfNumber={shelf.shelfNumber}
                    title={shelf.title}
                    subtitle={shelf.subtitle}
                    books={shelf.books}
                    selectedBookId={selectedBookId}
                    highlightedBookId={highlightedBookId}
                    searchQuery={searchQuery}
                    onSelectBook={handleSelectBook}
                    onHoverBook={(hovered, meta) => {
                      setHoveredBookMeta(hovered ? meta : null)
                    }}
                  />
                ))}
              </section>
            )}

            {/* A–Z Complete Library Stacks */}
            {(activeBayFilter === 'all' || activeBayFilter === 'catalog') && (
              <section className="space-y-8 pt-4">
                <div className="px-4 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <h2 className="font-display text-base sm:text-lg font-bold text-amber-100 tracking-wider uppercase">
                    A–Z General Archive Stacks
                  </h2>
                </div>

                {Object.entries(groupedBooks)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([section, sectionBooks]) => (
                    <ShelfBay
                      key={`section-${section}`}
                      bayId={`bay-section-${section}`}
                      shelfNumber={section}
                      title={`Section ${section}`}
                      subtitle={`Volumes starting with ${section}`}
                      books={sectionBooks}
                      selectedBookId={selectedBookId}
                      highlightedBookId={highlightedBookId}
                      searchQuery={searchQuery}
                      onSelectBook={handleSelectBook}
                      onHoverBook={(hovered, meta) => {
                        setHoveredBookMeta(hovered ? meta : null)
                      }}
                    />
                  ))}
              </section>
            )}
          </div>
        )}
      </motion.main>

      {/* Floating Bottom Archival HUD Bar (Criterion Closet Style) */}
      {!selectedBookId && (
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 inset-x-0 mx-auto w-fit z-30 pointer-events-none"
        >
          <div className="bg-[#120D0A]/90 border border-amber-500/40 rounded-full px-5 py-2 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center gap-3.5 text-xs pointer-events-auto">
            {hoveredBookMeta ? (
              <>
                <span className="font-mono text-amber-400 font-bold tracking-wider">
                  {hoveredBookMeta.catalogNo}
                </span>
                <span className="h-3 w-px bg-white/20" />
                <span className="font-serif font-semibold text-white max-w-[220px] sm:max-w-[320px] truncate">
                  {hoveredBookMeta.title}
                </span>
                {hoveredBookMeta.author && (
                  <>
                    <span className="h-3 w-px bg-white/20 hidden sm:inline" />
                    <span className="text-amber-200/80 hidden sm:inline truncate max-w-[160px]">
                      {hoveredBookMeta.author}
                    </span>
                  </>
                )}
                <span className="h-3 w-px bg-white/20" />
                <span className="text-[10px] font-mono text-amber-400 font-medium">
                  {hoveredBookMeta.discussionCount} {hoveredBookMeta.discussionCount === 1 ? 'discussion' : 'discussions'}
                </span>
                <span className="hidden md:inline text-[10px] font-serif text-white/40 italic">
                  · Click to pull
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-mono text-[11px] text-amber-200/75 uppercase tracking-widest">
                  BBB Digital Archive · {books.length} Volumes · Bangalore
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

      {/* Criterion Closet-Style Central Hero Book Inspection Dossier */}
      <HeroBookModal
        book={activeBook}
        shelfBooks={activeShelfBooks}
        isOpen={Boolean(selectedBookId && activeBook)}
        isSavedInBag={activeBook ? libraryBag.some((b) => b.id === activeBook.id) : false}
        onToggleBag={handleToggleBag}
        onClose={handleCloseHero}
        onSelectBook={handleSelectBook}
      />
    </div>
  )
}
