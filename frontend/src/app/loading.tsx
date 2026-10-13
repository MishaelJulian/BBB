export default function Loading() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center" aria-busy="true">
      <p role="status" className="text-sm text-muted">Loading…</p>
    </main>
  )
}
