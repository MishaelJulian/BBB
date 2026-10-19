import type { MetadataRoute } from 'next'
import { sql } from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bbbdemo.vercel.app'
export const revalidate = 86400

// Static pages plus one entry per meetup number. If the database is unreachable the static pages still list.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/directory', '/library-room', '/meetups', '/members', '/club', '/about', '/faq', '/listicles', '/privacy', '/terms'].map((p) => ({ url: `${SITE_URL}${p}` }))
  try {
    const rows = await sql()<{ meetup_number: number }[]>`select meetup_number from meetups order by meetup_number`
    return [...pages, ...rows.map((r) => ({ url: `${SITE_URL}/meetups/${r.meetup_number}` }))]
  } catch (e) {
    console.error('sitemap: meetups unavailable', e)
    return pages
  }
}
