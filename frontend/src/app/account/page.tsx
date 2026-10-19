import { Suspense } from 'react'
import { ClubPage } from '@/components/club/ClubPage'
import { AccountScreens } from '@/components/club/AccountScreens'

export const metadata = { title: 'Profile and account - BBB', robots: { index: false } }

export default function AccountPage() {
  return (
    <ClubPage kind="home" tab="me">
      <div className="sp24" />
      <div className="auth"><Suspense fallback={<p className="body">One moment...</p>}><AccountScreens /></Suspense></div>
      <div className="pad" />
    </ClubPage>
  )
}
