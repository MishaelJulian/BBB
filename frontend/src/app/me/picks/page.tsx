import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'
import { MePicks } from '@/components/club/MePicks'

export const metadata = { title: 'Closet Picks - BBB', robots: { index: false } }

export default function PicksPage() {
  return (
    <ClubPage kind="home" tab="me">
      <div className="sp24" />
      <Link className="back" href="/me"><span aria-hidden="true">&lsaquo;</span>Me</Link>
      <div className="auth"><MePicks /></div>
      <div className="pad" />
    </ClubPage>
  )
}
