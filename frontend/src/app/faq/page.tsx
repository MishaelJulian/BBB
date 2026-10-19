import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'

export const metadata = { title: 'FAQ - BBB', description: 'Questions people ask the Broke Bibliophiles.' }

const QA: [string, string][] = [
  ['When and where do you meet?', 'On the fourth or last Sunday of the month, from 2:30 to 4:30 pm, usually at The Bookworm on Church Street.'],
  ['How do I join?', 'Join the Facebook group, follow us on Twitter or subscribe on Substack, then come to the next meetup. Bring a book you would like to talk about.'],
  ['What is this site?', `An archive of the club's meetups, books and readers. Version ${process.env.NEXT_PUBLIC_APP_VERSION ?? ''}.`],
  ['How is my name removed?', 'Email the club. An admin can hide or remove your record.'],
  ['How do I link my record?', 'Ask an admin for your personal invite link. Open it, create your account, and your record links to it. After that your record is yours to edit.'],
  ['I am an author. Can I come to a meetup?', 'Yes. Email the club and we will talk about hosting you at a future meetup.'],
]

export default function FaqPage() {
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/club', label: 'Club' }, { label: 'FAQ' }]} tab="club">
      <div className="sp24" />
      <h1 className="h1">FAQ</h1>
      <p className="cap" style={{ margin: '6px 0 0' }}>Questions people ask us</p>
      <div className="faq">
        <dl>
          {QA.map(([q, a]) => (
            <div key={q}><dt>{q}</dt><dd>{a}</dd></div>
          ))}
        </dl>
      </div>
      <p className="body" style={{ marginTop: 32 }}>Still stuck? <a className="link" href="mailto:brokebibliophilesbangalore@gmail.com">Email the club</a></p>
      <div className="sp16" />
      <Link className="link" href="/about">&lsaquo; About Us</Link>
      <div className="sp32" />
    </ClubPage>
  )
}
