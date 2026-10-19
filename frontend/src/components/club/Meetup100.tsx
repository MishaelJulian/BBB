import Link from 'next/link'
import { ClubPage } from './ClubPage'
import { Timeline } from './Timeline'

export function Meetup100() {
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/directory', label: 'Directory' }, { href: '/meetups', label: 'Meetups' }, { label: '#100' }]} tab="dir">
      <div className="sp32" />
      <h1 className="h1">Meetup #100</h1>
      <p className="body" style={{ marginTop: 8 }}>11 Oct 2026 &middot; Samagata Foundation, Bangalore</p>
      <p className="cap" style={{ marginTop: 4 }}>28 photos, three moments</p>
      <p className="body" style={{ marginTop: 12 }}>An author spoke about his book, then there were games.</p>
      <div className="sp32" />
      <Timeline />
      <div style={{ borderTop: '1px solid var(--line2)', paddingTop: 24 }}>
        <p className="h2">That was the 100th.</p>
        <div className="sp16" />
        <a className="btn" href="https://brokebibliophilesbangalore.substack.com" target="_blank" rel="noopener">
          <span>Subscribe for the next one</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
        <div className="sp16" />
        <Link className="link" href="/meetups/99">&larr; Meetup #99</Link>
      </div>
    </ClubPage>
  )
}
