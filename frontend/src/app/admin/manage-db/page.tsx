import type { Metadata } from 'next'
import { ManageDbView } from '@/components/club/ManageDbView'

export const metadata: Metadata = { title: 'Manage DB — BBB' }

export default function Page() {
  return <ManageDbView />
}
