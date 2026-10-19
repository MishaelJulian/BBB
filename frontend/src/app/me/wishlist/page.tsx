import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'
import { MeWishlist } from '@/components/club/MeWishlist'

export const metadata = { title: 'Wishlist - BBB', robots: { index: false } }

export default function WishlistPage() {
  return (
    <ClubPage kind="home" tab="me">
      <div className="sp24" />
      <Link className="back" href="/me"><span aria-hidden="true">&lsaquo;</span>Me</Link>
      <div className="auth"><MeWishlist /></div>
    </ClubPage>
  )
}
