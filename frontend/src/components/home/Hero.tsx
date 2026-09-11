'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/shared/StatCard'
import { Container } from '@/components/layout/Container'
import { fetchStats } from '@/lib/api'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

export function Hero() {
  const [stats, setStats] = React.useState([
    { label: 'Since 2017', value: '' },
    { label: 'Recovered Meetups', value: '...' },
    { label: 'Canonical Books', value: '...' },
    { label: 'Members', value: '...' },
  ])

  React.useEffect(() => {
    fetchStats().then((data) => {
      setStats([
        { label: 'Since 2017', value: '' },
        { label: 'Recovered Meetups', value: data.total_meetups.toLocaleString() },
        { label: 'Canonical Books', value: data.canonical_books.toLocaleString() },
        { label: 'Members', value: data.members.toLocaleString() },
      ])
    }).catch(() => {})
  }, [])

  return (
    <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A1A1A' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <Container>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          {/* Title */}
          <motion.div variants={itemVariants}>
            <h1 className="font-display text-hero md:text-display-xl lg:text-[5rem] font-bold text-ink leading-[1.05] tracking-tight mb-2">
              BROKE BIBLIOPHILES
            </h1>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-ink leading-tight tracking-tight mb-6">
              OF BANGALORE
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-muted font-display italic mb-12"
          >
            A living archive of
            <br />
            conversations,
            <br />
            books,
            <br />
            and readers.
          </motion.p>

          {/* CTA */}
          <motion.div variants={itemVariants}>
            <Link href="/library-room">
              <Button size="xl" variant="accent">
                ENTER THE LIBRARY
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
          >
            {stats.map((stat, index) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value || ''}
                className={index === 0 ? 'hidden md:block' : ''}
              />
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </section>
  )
}
