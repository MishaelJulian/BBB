import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SiteShell } from '@/components/layout/SiteShell'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'BBB Library — Broke Bibliophiles of Bangalore',
    template: '%s | BBB Library',
  },
  description:
    'A living archive of conversations, books, and readers. Broke Bibliophiles of Bangalore, since 2017.',
  keywords: ['book club', 'Bangalore', 'BBB', 'reading', 'archive', 'literature'],
  authors: [{ name: 'Broke Bibliophiles of Bangalore' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
