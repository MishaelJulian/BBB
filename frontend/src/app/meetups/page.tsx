import { ClubPage } from '@/components/club/ClubPage'
import { MeetupsList } from '@/components/club/MeetupsList'
import { getMeetupIndex } from '@/lib/club/indexes'

export const revalidate = 3600
export const metadata = { title: 'Meetups - BBB', description: 'Every Broke Bibliophiles meetup on record: date, venue, readers and books.' }

export default async function MeetupsPage() {
  const data = await getMeetupIndex()
  const latest = Math.max(0, ...data.map((m) => m.n))
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/directory', label: 'Directory' }, { label: 'Meetups' }]} tab="dir">
      <MeetupsList data={data} latest={latest} />
    </ClubPage>
  )
}
