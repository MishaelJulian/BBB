import Link from 'next/link'
import { PixelRects, type IconName } from './icons'

const CELL = 7
const IC = CELL * 12
const COLOR = '#c93a14'

function Node({ x, y, icon, t1, t2, href }: { x: number; y: number; icon: IconName; t1: string; t2: string; href: string }) {
  return (
    <Link href={href} aria-label={`${t1}, ${t2}`}>
      <rect x={x - 60} y={y - 8} width={120} height={IC + 68} fill="transparent" />
      <PixelRects name={icon} cell={CELL} x={x - IC / 2} y={y} fill={COLOR} />
      <text x={x} y={y + IC + 22} textAnchor="middle" fontSize={15} fontWeight={600} fill="#1a1a1a">{t1}</text>
      <text x={x} y={y + IC + 40} textAnchor="middle" fontSize={14} fill="#4a4a4a">{t2}</text>
    </Link>
  )
}

/** Library Room at the top, Meetups and Readers below, joined by three curved lines. Counts are passed in from the database. */
export function Triptych({ books, meetups, latest, readers }: { books: number; meetups: number; latest: number; readers: number }) {
  const n = (v: number) => v.toLocaleString('en-IN')
  return (
    <svg viewBox="0 0 358 372" role="group" aria-label="Library Room, Meetups and Readers">
      <path d="M179 162 Q110 178 84 204" fill="none" stroke={COLOR} strokeWidth={2.5} />
      <path d="M179 162 Q248 178 274 204" fill="none" stroke={COLOR} strokeWidth={2.5} />
      <path d="M118 256 Q179 282 240 256" fill="none" stroke={COLOR} strokeWidth={2.5} />
      <Node x={179} y={22} icon="lib" t1="Library Room" t2={`${n(books)} books`} href="/library-room" />
      <Node x={78} y={212} icon="chat" t1="Meetups" t2={`${n(meetups)} of ${n(latest)} on record`} href="/meetups" />
      <Node x={280} y={212} icon="reader" t1="Readers" t2={`${n(readers)} members`} href="/members" />
    </svg>
  )
}
