import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meetups',
  description: 'Every Broke Bibliophiles of Bangalore meetup, with its date, venue and the books discussed.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
