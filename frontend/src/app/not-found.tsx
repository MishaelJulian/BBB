import { ClubPage } from '@/components/club/ClubPage'
import { NotFound404 } from '@/components/club/NotFound404'

export const metadata = { title: 'Page not found - BBB' }

export default function NotFound() {
  return (
    <ClubPage kind="home" tab="" noMap noSearch bare mainClass="r404">
      <NotFound404 />
    </ClubPage>
  )
}
