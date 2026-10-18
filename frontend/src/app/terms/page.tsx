import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms · BBB Library',
  description: 'Mock terms of use for the BBB Library demo: accounts, member entries, data and removal requests.',
}

// MOCK terms for the public demo. Not legal advice; a lawyer must review before the real launch.
// Laws are cited by name only. DPDP Rules 2025 were notified 13 Nov 2025; the notice and consent
// obligations apply from 13 May 2027, so this page states the practice we follow voluntarily.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-8 text-ink">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Terms of use</h1>
        <p className="text-sm text-muted">Last updated 13 October 2026</p>
      </header>

      <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm" role="note">
        <strong>Mock terms for a demo.</strong> These are written in plain language to show how the BBB Library
        will treat its users. They are not legal advice and have not been reviewed by a lawyer. Final terms will
        replace them before the real launch.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. What this is</h2>
        <p>
          The BBB Library is a volunteer, non-commercial archive run by the Broke Bibliophiles of Bangalore book
          club. This site is a demo: it can be slow, change, or be reset without notice, and we promise no uptime.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Accounts and member codes</h2>
        <p>
          You need an account only to sign in as a presenter or admin. You must be 18 or older. To connect your
          account to your member record in the archive, an admin gives you a one-time code that expires after 14
          days. Do not share it. We may disable accounts that misuse the site.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Acceptable use</h2>
        <p>
          Do not break the law, attack or overload the site, scrape it in ways that harm it, impersonate anyone, or
          post unlawful, defamatory, obscene or infringing content. Report abuse using the contact below.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. What you add</h2>
        <p>
          Signed-in members can add and edit their own book entries. You confirm you may share what you add. You
          give the club permission to publish it in the archive. Admins may edit or remove any entry. Every change
          to the archive is logged with who made it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Your personal data</h2>
        <p>
          We handle personal data under India&apos;s Digital Personal Data Protection Act, 2023 and the Digital
          Personal Data Protection Rules, 2025. The Rules were notified in November 2025 and phase in until 2027;
          we follow their main ideas now: tell you what we collect and why, collect only what we need, keep it
          only as long as needed, and let you ask for access, correction or erasure. We do not sell personal data.
          See the <Link href="/privacy" className="underline">Privacy</Link> page for details.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account data (email, password hash) is kept separately from the archive and never published.</li>
          <li>The audit log and nightly backups hold copies for a short time (backups rotate over about three days).</li>
          <li>The site sets one cookie, for the login session only.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Platform role and takedowns</h2>
        <p>
          For content users add, the site acts as an intermediary under the Information Technology Act, 2000 and
          the rules made under it. If you think something is unlawful or infringes your rights, tell us at the
          contact below and we will review it and act promptly, which may include removing it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Books, covers and other sources</h2>
        <p>
          Book titles, authors and covers come from public book sources and belong to their owners. Meetup notes
          and write-ups belong to the club and its members. Nothing here grants you rights to republish them
          commercially.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. No warranty, limited liability</h2>
        <p>
          The site is provided as is. To the extent the law allows, the club and its volunteers are not liable for
          losses from using it or from demo data being changed or reset.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Changes and governing law</h2>
        <p>
          We may update these terms and will change the date above. Indian law governs them, and the courts at
          Bengaluru, Karnataka have jurisdiction, unless the law says otherwise.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">10. Contact and grievances</h2>
        <p>
          Questions, removal requests, data requests and complaints go to the club. We will reply within 90 days
          at the latest.
        </p>
        <p>
          <strong>Contact / grievance officer:</strong>{' '}
          <a href="mailto:brokebibliophilesbangalore@gmail.com" className="underline underline-offset-4 hover:text-accent">
            brokebibliophilesbangalore@gmail.com
          </a>
        </p>
      </section>
    </main>
  )
}
