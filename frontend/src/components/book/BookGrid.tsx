import { cn } from '@/lib/utils'
import { BookCard } from './BookCard'
import type { Book } from '@/lib/api'

interface BookGridProps {
  books: Book[]
  view?: 'grid' | 'list'
  className?: string
}

export function BookGrid({ books, view = 'grid', className }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No books found matching your criteria.</p>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className={cn('divide-y divide-border', className)}>
        {books.map((book) => (
          <BookCard
            key={book.id}
            id={book.id}
            title={book.title}
            author={book.author_name || undefined}
            discussionCount={book.discussion_count}
            firstDiscussedYear={book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : undefined}
            view="list"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8',
        className
      )}
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          id={book.id}
          title={book.title}
          author={book.author_name || undefined}
          discussionCount={book.discussion_count}
          firstDiscussedYear={book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : undefined}
          view="grid"
        />
      ))}
    </div>
  )
}
