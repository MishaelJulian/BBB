import { ClubPage } from '@/components/club/ClubPage'
import { ReadersList } from '@/components/club/ReadersList'
import { getReaderIndex } from '@/lib/club/indexes'

export const revalidate = 3600
export const metadata = { title: 'Readers - BBB', description: 'The readers of the Broke Bibliophiles book club.' }

export default async function ReadersPage() {
  const data = await getReaderIndex()
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/directory', label: 'Directory' }, { label: 'Readers' }]} tab="dir">
      <ReadersList data={data} />
    </ClubPage>
  )
}
