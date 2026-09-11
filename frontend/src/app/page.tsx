'use client'

import * as React from 'react'
import { Hero } from '@/components/home/Hero'
import { Section } from '@/components/layout/Section'
import { Container } from '@/components/layout/Container'
import { BookCard } from '@/components/book/BookCard'
import { MeetupCard } from '@/components/meetup/MeetupCard'
import { LoadingState } from '@/components/shared/LoadingState'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { fetchBooks, fetchMeetups } from '@/lib/api'
import type { Book, Meetup } from '@/lib/api'

export default function HomePage() {
  const [featuredBooks, setFeaturedBooks] = React.useState<Book[]>([])
  const [latestMeetups, setLatestMeetups] = React.useState<Meetup[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [booksData, meetupsData] = await Promise.all([
          fetchBooks({ sortBy: 'discussionCount', sortOrder: 'desc', limit: 6 }),
          fetchMeetups(),
        ])

        setFeaturedBooks(booksData)
        setLatestMeetups(meetupsData.slice(0, 3))
      } catch (err) {
        console.error('Failed to fetch homepage data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
      <Hero />

      {/* Featured Books */}
      <Section>
        <Container>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">
                Most Discussed
              </h2>
              <p className="text-muted mt-1">Books with the most BBB discussions</p>
            </div>
            <Link href="/library">
              <Button variant="ghost">View all</Button>
            </Link>
          </div>

          {loading ? (
            <LoadingState count={6} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {featuredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author_name || undefined}
                  discussionCount={book.discussion_count}
                  firstDiscussedYear={book.first_discussed_date ? new Date(book.first_discussed_date).getFullYear() : 2017}
                />
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* Latest Meetups */}
      <Section>
        <Container>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">
                Recent Meetups
              </h2>
              <p className="text-muted mt-1">The latest BBB gatherings</p>
            </div>
            <Link href="/meetups">
              <Button variant="ghost">View all</Button>
            </Link>
          </div>

          {loading ? (
            <LoadingState count={3} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestMeetups.map((meetup) => (
                <MeetupCard
                  key={meetup.id}
                  id={meetup.id}
                  number={meetup.number}
                  date={meetup.date}
                  venue={meetup.venue || 'Unknown'}
                  bookCount={meetup.book_count}
                  memberCount={meetup.member_count}
                />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  )
}
