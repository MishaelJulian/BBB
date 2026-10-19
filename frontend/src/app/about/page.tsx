import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'

export const metadata = { title: 'About Us - BBB', description: 'Broke Bibliophiles Bangalore: who we are, when and where we meet.' }

const DEVS = [
  { name: 'Mishael', cap: 'The Visionary. Built the Closet and the Archive', href: 'https://github.com/MishaelJulian', gh: 'github.com/MishaelJulian', img: '/ui/team/mishael.jpg', label: 'Mishael on GitHub: The Visionary. Built the Closet and the Archive' },
  { name: 'Dhilipan', cap: 'The Architect. Built the Stats and the Website.', href: 'https://github.com/dhilipa01', gh: 'github.com/dhilipa01', img: '/ui/team/dhilipan.png', label: 'Dhilipan on GitHub: The Architect. Built the Stats and the Website.' },
]

export default function AboutPage() {
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/club', label: 'Club' }, { label: 'About Us' }]} tab="club">
      <div className="about">
        <div className="sp24" />
        <h1 className="h1">About Us</h1>
        <p className="tag">A book club for the amateurs, nerds, geeks and enthusiasts of Bangalore.</p>
        <p className="body pas">Broke Bibliophiles Bangalore was co-created, and is run, by Abhiram R and Radhika Chauhan. It has been active since early 2017.</p>
        <p className="body pas">We meet on the fourth or last Sunday of the month at The Bookworm on Church Street, from 2:30 to 4:30 pm. Most of our meetups have been there, with others at Atta Galatta and online. Apart from the monthly meetup there are author events and writing prompts. Our hundredth meetup was on 11 October 2026.</p>
        <p className="body pas">If you like books and want to talk about them, or just hear about them, with a group of like-minded people, you are in the right place.</p>
        <p className="body pas">For years our book log, reading lists and writing prompts lived on an older website and in the Facebook group. This site keeps the club&apos;s record in one place: every meetup, every book and every reader.</p>
        <p className="body pas">Anyone can join. The Facebook group has writing prompts, listings of books on different topics and reviews. Twitter carries news from the literary world. The Substack newsletter lists upcoming literary events in Bangalore, with RSVP links to our meetups.</p>
        <p className="body pas">If you are an author, email us. We would love to host you at a future meetup.</p>
        <div className="fol">
          <a className="link" href="https://brokebibliophilesbangalore.substack.com" rel="noopener">Substack</a>
          <a className="link" href="https://facebook.com/groups/brokebangalore" rel="noopener">Facebook group</a>
          <a className="link" href="https://twitter.com/BibliophilesBlr" rel="noopener">Twitter</a>
          <a className="link" href="https://www.instagram.com/brokebibliophilesbangalore/" rel="noopener">Instagram</a>
          <a className="link" href="mailto:brokebibliophilesbangalore@gmail.com">Email</a>
        </div>
        <div className="sp24" />
        <a className="btn" href="https://brokebibliophilesbangalore.substack.com" rel="noopener">
          <span>Subscribe for the next one</span>
          <span aria-hidden="true">&rsaquo;</span>
        </a>
        <div className="sp16" />
        <Link className="link" href="/faq">Questions? Read the FAQ &rsaquo;</Link>
        <section className="built" aria-labelledby="bh">
          <h2 className="h2" id="bh">Built by</h2>
          <p className="body pas">A couple of CS dudes who&apos;ve yet to have an internship that&apos;s paid.</p>
          {DEVS.map((d) => (
            <a key={d.name} className="dev" href={d.href} rel="noopener" aria-label={d.label}>
              <span className="slot" aria-hidden="true" />
              <span className="top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.img} alt="" width={56} height={56} />
                <span><span className="nm">{d.name}</span><span className="cap">{d.cap}</span></span>
                <span className="go" aria-hidden="true">&rsaquo;</span>
              </span>
              <span className="gh">{d.gh}</span>
            </a>
          ))}
        </section>
        <div className="sp32" />
      </div>
    </ClubPage>
  )
}
