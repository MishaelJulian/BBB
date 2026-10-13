'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Georgia, serif', background: '#FAF8F5', color: '#1A1A1A', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <main role="alert" style={{ textAlign: 'center', padding: 24 }}>
          <h1>Something went wrong</h1>
          <p>The site could not load. This is usually temporary.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 20px', background: '#8B4513', color: '#fff', border: 0, borderRadius: 6, fontWeight: 600 }}>Try again</button>
        </main>
      </body>
    </html>
  )
}
