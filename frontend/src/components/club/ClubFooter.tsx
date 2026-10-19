import Link from 'next/link'

// LAPL-style groups, one column on phones, with the sticky reveal (approved in the mockup).
export function ClubFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="brandline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ui/logo-bbb-arc-96.png" width={48} height={48} alt="" />
          <div>
            <b style={{ font: '600 18px/24px var(--serif)' }}>BBB</b>
            <p className="fine">A book club in Bangalore, since 2017. Fourth Sunday, Bookworm.</p>
          </div>
        </div>
        <div>
          <h3>Directory</h3>
          <Link href="/meetups">Meetups</Link>
          <Link href="/members">Readers</Link>
          <Link href="/library-room">Library Room</Link>
        </div>
        <div>
          <h3>Club</h3>
          <Link href="/about">About Us</Link>
          <Link href="/listicles">Listicles</Link>
          <Link href="/meetups/100">Events</Link>
          <Link href="/faq">FAQ</Link>
        </div>
        <div>
          <h3>Follow</h3>
          <a href="https://brokebibliophilesbangalore.substack.com" rel="noopener">Substack</a>
          <a href="https://www.instagram.com/brokebibliophilesbangalore/" rel="noopener">Instagram</a>
          <a href="https://twitter.com/BibliophilesBlr" rel="noopener">Twitter</a>
          <a href="https://facebook.com/groups/brokebangalore" rel="noopener">Facebook group</a>
          <a href="mailto:brokebibliophilesbangalore@gmail.com">brokebibliophilesbangalore@gmail.com</a>
        </div>
        <div className="legal">
          <span>
            <Link href="/privacy">Privacy</Link> <Link href="/terms">Terms</Link>
          </span>
          <a className="gh" href="https://github.com/MishaelJulian/BBB" rel="noopener" aria-label="Source code on GitHub">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a href="#top">To top &uarr;</a>
        </div>
        <p className="fine">&copy; 2026 Broke Bibliophiles Bangalore. Map &copy; OpenStreetMap contributors.</p>
      </div>
    </footer>
  )
}
