'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const navItems = [
  { href: '/library-room', label: 'The Library Room' },
  { href: '/library', label: 'Library' },
  { href: '/meetups', label: 'Meetups' },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const isLibraryRoom = pathname === '/library-room'

  return (
    <header
      className={cn(
        'sticky top-0 z-navigation border-b transition-colors duration-300',
        isLibraryRoom
          ? 'bg-[#14100D]/95 border-amber-950/50 text-[#F4EFE6] backdrop-blur-xl'
          : 'bg-paper/95 border-border text-ink backdrop-blur supports-[backdrop-filter]:bg-paper/60'
      )}
    >
      <nav className="container-library flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span
            className={cn(
              'font-display text-lg font-semibold',
              isLibraryRoom ? 'text-white' : 'text-ink'
            )}
          >
            BBB Library
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors',
                isLibraryRoom
                  ? pathname === item.href
                    ? 'text-amber-400 font-semibold'
                    : 'text-white/60 hover:text-white'
                  : pathname === item.href
                    ? 'text-ink font-semibold'
                    : 'text-muted hover:text-ink'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            className={isLibraryRoom ? 'text-white/70 hover:text-white hover:bg-white/10' : ''}
          >
            <svg
              className="h-5 w-5"
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
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Command palette"
            className={isLibraryRoom ? 'text-white/70 hover:text-white hover:bg-white/10' : ''}
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
            </svg>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={cn('md:hidden p-2', isLibraryRoom ? 'text-white' : 'text-ink')}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          suppressHydrationWarning
        >
          {mobileMenuOpen ? (
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-paper">
          <div className="container-library py-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block text-base font-medium transition-colors hover:text-ink',
                  pathname === item.href
                    ? 'text-ink'
                    : 'text-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              <Button variant="outline" className="w-full">
                Search
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
