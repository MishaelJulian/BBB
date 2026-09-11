import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface MeetupCardProps {
  id: string
  number: number
  date: string
  venue: string
  bookCount: number
  memberCount: number
  className?: string
}

export function MeetupCard({
  id,
  number,
  date,
  venue,
  bookCount,
  memberCount,
  className,
}: MeetupCardProps) {
  return (
    <Link
      href={`/meetups/${number}`}
      className={cn(
        'block p-6 rounded-lg border border-border hover:border-accent hover:shadow-card-hover transition-all group',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="font-display text-3xl font-bold text-ink group-hover:text-accent transition-colors">
          #{number}
        </div>
        <svg
          className="h-5 w-5 text-muted-light group-hover:text-accent transition-colors"
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

      <div className="space-y-2">
        <div className="text-sm text-muted">
          {formatDate(date)}
        </div>
        <div className="text-sm text-muted-light">
          {venue}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-sm text-muted">
        <span>{bookCount} books</span>
        <span>{memberCount} members</span>
      </div>
    </Link>
  )
}
