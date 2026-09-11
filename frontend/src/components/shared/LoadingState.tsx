import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

interface LoadingStateProps {
  className?: string
  count?: number
}

function LoadingState({ className, count = 3 }: LoadingStateProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { LoadingState }
