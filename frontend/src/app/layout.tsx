import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/styles/club.css'
import '@/styles/club-extra.css'
import { SiteShell } from '@/components/layout/SiteShell'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#FAF8F5',
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bbbdemo.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    siteName: 'BBB Library',
    title: 'BBB Library — Broke Bibliophiles of Bangalore',
    description: 'A living archive of conversations, books, and readers. Broke Bibliophiles of Bangalore, since 2017.',
  },
  twitter: { card: 'summary_large_image' },
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
    <html lang="en" className={inter.variable} data-accent="orange" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
