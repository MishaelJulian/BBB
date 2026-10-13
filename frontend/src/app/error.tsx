'use client'

import * as React from 'react'

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main role="alert" className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl text-ink">Something went wrong</h1>
      <p className="max-w-md text-muted">The page could not load. This is usually temporary.</p>
      <button type="button" onClick={reset} className="h-11 px-5 rounded-md bg-amber-800 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">Try again</button>
    </main>
  )
}
