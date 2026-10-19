import { ClubPage } from '@/components/club/ClubPage'
import { MeHome } from '@/components/club/MeHome'

export const metadata = { title: 'Me - BBB', robots: { index: false } }

export default function MePage() {
  return (
    <ClubPage kind="home" tab="me">
      <div className="sp24" />
      <div className="auth"><MeHome /></div>
      <div className="sp32" />
    </ClubPage>
  )
}
