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

// A list row, not a card (docs/ux/ADR-ui-revamp.md section 5): the meetup is a title line, a facts line and a counts line,
// separated from the next row by a hairline. The cover strip and the big numeral are gone.
export function MeetupCard({ number, date, venue, bookCount, memberCount, className }: MeetupCardProps) {
  return (
    <Link
      href={`/meetups/${number}`}
      className={cn('group block py-4 border-b border-border hover:bg-paper-dark/60 -mx-2 px-2', className)}
    >
      <h2 className="font-display text-xl font-semibold text-ink underline decoration-transparent underline-offset-4 group-hover:decoration-accent">
        Meetup #{number}
      </h2>
      <p className="mt-1 text-base text-ink-light">
        {formatDate(date)} · {venue}
      </p>
      <p className="mt-0.5 text-sm text-muted">
        {bookCount} {bookCount === 1 ? 'book' : 'books'} · {memberCount} {memberCount === 1 ? 'member' : 'members'}
      </p>
    </Link>
  )
}
