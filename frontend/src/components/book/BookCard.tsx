'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getBookColor } from '@/lib/utils'

interface BookCardProps {
  id: string
  title: string
  author?: string
  discussionCount?: number
  firstDiscussedYear?: number
  view?: 'grid' | 'list'
}

export function BookCard({
  id,
  title,
  author,
  discussionCount = 0,
  firstDiscussedYear,
  view = 'grid',
}: BookCardProps) {
  const coverColor = getBookColor(title)

  if (view === 'list') {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg hover:bg-paper-dark transition-colors group border-b border-border/40">
        <Link
          href={`/books/${id}`}
          className="flex items-center gap-4 flex-1 min-w-0"
        >
          {/* Mini cover */}
          <div
            className="w-10 h-14 rounded-sm shrink-0 shadow-sm"
            style={{ backgroundColor: coverColor }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-ink truncate group-hover:text-amber-900 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted truncate">{author}</p>
          </div>

          {/* Meta */}
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted mr-4">
            {firstDiscussedYear && <span>{firstDiscussedYear}</span>}
            <span>{discussionCount} {discussionCount === 1 ? 'discussion' : 'discussions'}</span>
          </div>
        </Link>

        <Link
          href={`/library-room?select=${id}`}
          className="text-xs font-mono text-amber-900/80 dark:text-amber-300 hover:text-amber-800 hover:underline px-2.5 py-1 rounded bg-paper border border-border shrink-0 ml-2"
        >
          3D Shelf →
        </Link>
      </div>
    )
  }

  return (
    <div className="group block">
      <Link href={`/books/${id}`}>
        <div className="relative aspect-[2/3] rounded-sm overflow-hidden shadow-book group-hover:shadow-book-hover transition-shadow">
          {/* Book cover */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-between p-4 text-center"
            style={{ backgroundColor: coverColor }}
          >
            {/* Cloth texture */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000000' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Top line */}
            <div className="w-8 h-px bg-white/30 relative z-10" />

            {/* Title and author */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
              <h3 className="font-display font-bold text-sm leading-tight text-white line-clamp-3 mb-1">
                {title}
              </h3>
              {author && (
                <p className="text-[10px] text-white/70 line-clamp-1 tracking-wider uppercase">
                  {author}
                </p>
              )}
            </div>

            {/* Bottom line */}
            <div className="w-8 h-px bg-white/30 relative z-10" />
          </div>

          {/* Edge highlights */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-black/20" />
        </div>
      </Link>

      {/* Card info below cover */}
      <div className="mt-3 space-y-1">
        <Link href={`/books/${id}`}>
          <h3 className="font-display font-semibold text-ink text-sm truncate group-hover:text-amber-900 transition-colors">
            {title}
          </h3>
        </Link>
        <p className="text-xs text-muted truncate">{author}</p>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-light pt-1">
          <span>{discussionCount} {discussionCount === 1 ? 'disc.' : 'disc.'}</span>
          <Link
            href={`/library-room?select=${id}`}
            className="font-mono text-[10px] text-amber-900/80 dark:text-amber-300 hover:underline"
          >
            3D Shelf →
          </Link>
        </div>
      </div>
    </div>
  )
}
