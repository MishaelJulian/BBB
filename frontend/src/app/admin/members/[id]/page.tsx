import { AdminMember } from '@/components/club/AdminMembers'

export const metadata = { title: 'Member - Admin - BBB', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminMember id={decodeURIComponent(id)} />
}
