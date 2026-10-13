import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Library Room',
  description: 'Browse every book and piece of media the Broke Bibliophiles of Bangalore have discussed.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
