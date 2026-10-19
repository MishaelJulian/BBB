import { AdminMeetup } from '@/components/club/AdminMeetups'

export const metadata = { title: 'Meetup - Admin - BBB', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  return <AdminMeetup number={Number(number)} />
}
