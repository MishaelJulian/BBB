import { sql } from '@/lib/db'

// The meetup page is a client shell that fetches its data, so caching its HTML is safe: 60 s, then rebuilt in the background.
// The newest meetups are prerendered at build; any other number is rendered on first visit and cached the same way.
export const revalidate = 60

export async function generateStaticParams() {
  try {
    const rows = await sql()<{ n: number }[]>`select meetup_number as n from meetups order by meetup_number desc limit 5`
    return rows.map((r) => ({ id: String(r.n) }))
  } catch {
    return [{ id: '99' }] // database unreachable at build time: still prerender the latest known meetup
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
