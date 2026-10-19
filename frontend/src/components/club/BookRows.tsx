'use client'

import * as React from 'react'
import Link from 'next/link'

export interface RowBook {
  id: string
  title: string
  author: string | null
  cover: string | null
  /** the reader who brought it (meetup page) */
  by?: { name: string; id?: string } | null
  /** meetups it came up at (reader page) */
  meetups?: number[]
}

function Thumb({ b }: { b: RowBook }) {
  return b.cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="th" src={b.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
  ) : (
    <span className="nc" aria-hidden="true">{b.title.slice(0, 18)}</span>
  )
}

/** Books as rows: a small cover, title, author and who brought it. Used on the meetup page and the reader page (the meetup page keeps rows, not the grid, on purpose). */
export function BookRows({ books, step = 0 }: { books: RowBook[]; step?: number }) {
  const [shown, setShown] = React.useState(step || books.length)
  const v = books.slice(0, shown)
  return (
    <>
      <div>
        {v.map((b) => (
          <div className="brow" key={b.id}>
            <Thumb b={b} />
            <div>
              <Link className="bk" href={`/library-room?select=${b.id}#list`}>
                <b>{b.title}</b>
                <span>{b.author || 'Author not recorded'}</span>
              </Link>
              {b.by &&
                (b.by.id ? (
                  <Link className="by" href={`/members/${b.by.id}`}>
                    Brought by <span className="red" style={{ marginLeft: 4 }}>{b.by.name}</span>
                  </Link>
                ) : (
                  <span className="by">Brought by {b.by.name}</span>
                ))}
              {b.meetups && (
                <div className="mt">
                  {b.meetups.map((n) => (
                    <Link key={n} href={`/meetups/${n}`}>#{n}</Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {step > 0 && books.length > shown && (
        <button className="rd" type="button" onClick={() => setShown((s) => s + step)}>Show more ({books.length - shown})</button>
      )}
    </>
  )
}
