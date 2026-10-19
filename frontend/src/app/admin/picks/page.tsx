import { ClubPage } from '@/components/club/ClubPage'
import { AdminPicks } from '@/components/club/AdminPicks'

export const metadata = { title: 'Closet Picks - Admin - BBB', robots: { index: false, follow: false } }

export default function AdminPicksPage() {
  return (
    <ClubPage kind="home" tab="">
      <div className="sp24" />
      <div className="auth"><AdminPicks /></div>
    </ClubPage>
  )
}
