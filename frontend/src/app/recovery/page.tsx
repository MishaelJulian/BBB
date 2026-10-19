import { ClubPage } from '@/components/club/ClubPage'
import { RecoveryScreen } from '@/components/club/RecoveryScreen'

export const metadata = { title: 'Recovery phrase - BBB', robots: { index: false } }

export default function RecoveryPage() {
  return (
    <ClubPage kind="back" tab="me">
      <div className="sp24" />
      <RecoveryScreen />
      <div className="pad" />
    </ClubPage>
  )
}
