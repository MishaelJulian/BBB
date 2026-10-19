import Link from 'next/link'
import { ClubPage } from '@/components/club/ClubPage'
import L from '@/lib/club/listicles.json'

export const metadata = { title: 'Listicles - BBB', description: 'Reading lists and guides from the Broke Bibliophiles.' }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (d: string) => {
  const t = new Date(d + 'T00:00:00')
  return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}

export default function ListiclesPage() {
  const s = [...L].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/club', label: 'Club' }, { label: 'Listicles' }]} tab="club">
      <div className="sp24" />
      <h1 className="h1">Listicles</h1>
      <p className="cap" style={{ margin: '6px 0 0' }}>Reading lists from the club</p>
      <div className="sp24" />
      <div>
        {s.map((l) => (
          <Link key={l.slug} className="rowl" href={`/listicles/${l.slug}`}>
            <span><span className="t1">{l.title}</span><span className="t2">{fmt(l.date)}</span></span>
            <span className="go" aria-hidden="true">&rsaquo;</span>
          </Link>
        ))}
      </div>
      <div className="sp32" />
    </ClubPage>
  )
}
