'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SearchBarProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (query: string) => void
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch?.(e.target.value)
    }

    return (
      <div className="relative w-full">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-paper pl-10 pr-4 py-2 text-sm',
            'placeholder:text-muted-light',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          placeholder="Search books, authors, members..."
          onChange={handleChange}
          {...props}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-paper-dark px-1.5 font-mono text-[10px] font-medium text-muted-light sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    )
  }
)
SearchBar.displayName = 'SearchBar'

export { SearchBar }
