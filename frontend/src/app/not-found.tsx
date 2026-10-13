import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-mono text-muted">404</p>
      <h1 className="font-display text-3xl text-ink">That page is not on our shelves</h1>
      <p className="max-w-md text-muted">The link may be old, or the book or meetup was never catalogued here.</p>
      <div className="flex gap-3">
        <Link href="/" className="h-11 px-5 inline-flex items-center rounded-md bg-amber-800 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">Back to the library</Link>
        <Link href="/meetups" className="h-11 px-5 inline-flex items-center rounded-md border border-border text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">Browse meetups</Link>
      </div>
    </main>
  )
}
