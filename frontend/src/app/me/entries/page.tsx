import { ClubPage } from '@/components/club/ClubPage'
import { MeEntries } from '@/components/club/MeEntries'
import Link from 'next/link'

export const metadata = { title: 'Entries - BBB', robots: { index: false } }

export default function EntriesPage() {
  return (
    <ClubPage kind="home" tab="me">
      <div className="sp24" />
      <Link className="back" href="/me"><span aria-hidden="true">&lsaquo;</span>Me</Link>
      <div className="auth"><MeEntries /></div>
      <div className="pad" />
    </ClubPage>
  )
}
