import { Skeleton } from '@/components/ui/Skeleton'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'

export function PageSkeleton() {
  return (
    <Section>
      <Container>
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function BookPageSkeleton() {
  return (
    <Section size="lg">
      <Container size="narrow">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <Skeleton className="w-full md:w-64 aspect-[2/3] rounded-lg shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

export function MeetupPageSkeleton() {
  return (
    <Section size="lg">
      <Container size="narrow">
        <div className="text-center space-y-4">
          <Skeleton className="h-20 w-32 mx-auto" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-12 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
