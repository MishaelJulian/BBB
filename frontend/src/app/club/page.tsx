import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'

export const metadata = { title: 'Club - BBB', description: 'A book club for the amateurs, nerds, geeks and enthusiasts of Bangalore.' }

const ROWS: [string, string, string][] = [
  ['/about', 'About Us', 'Who we are, when and where we meet'],
  ['/listicles', 'Listicles', 'Reading lists from the club'],
  ['/meetups/100', 'Special events', 'Meetup #100, 11 Oct 2026'],
  ['/faq', 'FAQ', 'Questions people ask us'],
]

export default function ClubHub() {
  return (
    <ClubPage kind="home" tab="club">
      <div className="sp24" />
      <h1 className="h1">Club</h1>
      <p className="cap sub">A book club for the amateurs, nerds, geeks and enthusiasts of Bangalore</p>
      <div className="sp24" />
      <div>
        {ROWS.map(([href, t1, t2]) => (
          <Link key={href} className="rowl" href={href}>
            <span><span className="t1">{t1}</span><span className="t2">{t2}</span></span>
            <span className="go" aria-hidden="true">&rsaquo;</span>
          </Link>
        ))}
        <a className="rowl" href="mailto:brokebibliophilesbangalore@gmail.com">
          <span><span className="t1">Contact</span><span className="t2">Email the club</span></span>
          <span className="go" aria-hidden="true">&rsaquo;</span>
        </a>
      </div>
      <p className="gt2">Follow</p>
      <div className="fol">
        <a className="link" href="https://brokebibliophilesbangalore.substack.com" rel="noopener">Substack</a>
        <a className="link" href="https://www.instagram.com/brokebibliophilesbangalore/" rel="noopener">Instagram</a>
        <a className="link" href="https://twitter.com/BibliophilesBlr" rel="noopener">Twitter</a>
        <a className="link" href="https://facebook.com/groups/brokebangalore" rel="noopener">Facebook group</a>
      </div>
      <div className="sp32" />
    </ClubPage>
  )
}
