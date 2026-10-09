import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy · BBB Library',
  description: 'What the BBB Library archive stores, what is public, and how to ask for removal.',
}

// Content follows PRD §17.2 and decision D8 (docs/architecture/imperative_decisions.md §6).
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-8 text-ink">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Privacy</h1>
        <p className="text-sm text-muted">Last updated 9 October 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What this site is</h2>
        <p>
          The BBB Library is the archive of the Broke Bibliophiles of Bangalore book club: which books were
          discussed, at which meetup, when, and by whom. It is a volunteer, non-commercial project.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What is public</h2>
        <p>
          The archive is public on purpose. It shows meetup dates and venues, the books discussed, and the
          display names of the members who discussed them, along with discussion notes recorded at meetups.
          The archive&apos;s data and the site&apos;s source code are published in a public repository.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What is private</h2>
        <p>
          Presenters and admins sign in with an email address and password. Those account details are stored
          separately from the archive, on a server in Bangalore, are never published, and are used only to
          sign in. Visitors who only read the archive do not need an account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cookies and tracking</h2>
        <p>
          The site sets one cookie, and only for people who sign in: the login session. There are no
          advertising or analytics trackers on the public pages.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Removing your name</h2>
        <p>
          If your name appears in the archive and you would like it removed or changed, or you have a question
          about your data, contact the club. We will reply within 90 days, as India&apos;s Digital Personal Data
          Protection Rules require.
        </p>
        {/* Placeholder chosen by the founders (2026-10-09): fill in before the public link is shared. */}
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <strong>Contact:</strong> to be added by the founders.
        </p>
      </section>
    </main>
  )
}
