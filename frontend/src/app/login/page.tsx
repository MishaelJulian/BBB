import { ClubPage } from '@/components/club/ClubPage'
import { AuthForm } from '@/components/club/AuthForm'

export const metadata = { title: 'Sign in - BBB', robots: { index: false } }

export default function LoginPage() {
  return (
    <ClubPage kind="back" tab="me">
      <div className="sp24" />
      <AuthForm />
      <div className="sp32" />
    </ClubPage>
  )
}
