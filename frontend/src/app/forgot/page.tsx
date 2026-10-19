import { ClubPage } from '@/components/club/ClubPage'
import { ForgotFlow } from '@/components/club/ForgotFlow'

export const metadata = { title: 'Reset your password - BBB', robots: { index: false } }

export default function ForgotPage() {
  return (
    <ClubPage kind="back" tab="me">
      <div className="sp24" />
      <ForgotFlow />
      <div className="pad" />
    </ClubPage>
  )
}
