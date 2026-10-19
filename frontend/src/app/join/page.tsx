import { ClubPage } from '@/components/club/ClubPage'
import { JoinFlow } from '@/components/club/JoinFlow'

export const metadata = { title: 'Your invite - BBB', robots: { index: false } }

export default function JoinPage() {
  return (
    <ClubPage kind="back" tab="me">
      <div className="sp24" />
      <JoinFlow />
      <div className="sp32" />
    </ClubPage>
  )
}
