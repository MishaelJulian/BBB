import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { BookReference } from '@/lib/api'

interface MeetupCardProps {
  id: string
  number: number
  date: string
  venue: string
  bookCount: number
  memberCount: number
  books?: BookReference[]
  className?: string
}

export function MeetupCard({
  id,
  number,
  date,
  venue,
  bookCount,
  memberCount,
  books,
  className,
}: MeetupCardProps) {
  const covers = (books || [])
    .map((b) => b.cover_url || b.thumbnail_url)
    .filter(Boolean) as string[]

  return (
    <Link
      href={`/meetups/${number}`}
      className={cn(
        'block p-6 rounded-xl border border-border bg-paper hover:border-amber-700/50 hover:shadow-card-hover transition-all group',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="font-display text-3xl font-bold text-ink group-hover:text-amber-900 transition-colors">
          #{number}
        </div>
        <svg
          className="h-5 w-5 text-muted-light group-hover:text-amber-900 transition-colors"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium text-muted">
          {formatDate(date)}
        </div>
        <div className="text-xs text-muted-light truncate">
          {venue}
        </div>
      </div>

      {/* Book Covers Preview Strip */}
      {covers.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border/50 overflow-hidden">
          {covers.slice(0, 5).map((cover, idx) => (
            <div
              key={idx}
              className="w-8 aspect-[2/3] rounded-[2px] shadow-xs overflow-hidden border border-border/80 shrink-0 bg-neutral-900 group-hover:scale-105 transition-transform"
            >
              <img
                src={cover}
                alt="Book cover preview"
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ))}
          {bookCount > 5 && (
            <span className="text-[10px] font-mono text-muted/60 pl-1">
              +{bookCount - Math.min(bookCount, 5)}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs font-mono text-muted">
        <span>{bookCount} {bookCount === 1 ? 'book' : 'books'}</span>
        <span>·</span>
        <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
      </div>
    </Link>
  )
}
