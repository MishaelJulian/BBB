import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Members',
  description: 'The readers of the Broke Bibliophiles of Bangalore book club and what they have read.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
