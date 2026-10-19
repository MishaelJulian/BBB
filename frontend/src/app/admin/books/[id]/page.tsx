import { AdminBook } from '@/components/club/AdminBooks'

export const metadata = { title: 'Edit book - Admin - BBB', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminBook id={decodeURIComponent(id)} />
}
