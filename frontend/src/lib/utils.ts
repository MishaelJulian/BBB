import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format a date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date to short string
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })
}

/**
 * Get meetup number with hash
 */
export function formatMeetupNumber(num: number): string {
  return `#${num}`
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

/**
 * Generate placeholder book cover color based on title
 */
export function getBookColor(title: string): string {
  // Library-inspired color palette — Folio Society / Everyman's Library tones
  const colors = [
    '#2D4A3E', // Forest Green
    '#1E3A5F', // Oxford Blue
    '#6B2D3E', // Burgundy
    '#5C1A1A', // Oxblood
    '#4A3728', // Walnut Brown
    '#2D2D2D', // Charcoal
    '#3D2B4F', // Deep Plum
    '#1A3D3D', // Dark Emerald
    '#3D5A6E', // Slate Blue
    '#6B2D2D', // Antique Red
  ]

  // Simple hash from title
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
