import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  className?: string
}

function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className="text-3xl md:text-4xl font-display font-bold text-ink">
        {value}
      </div>
      <div className="text-sm text-muted mt-1">{label}</div>
    </div>
  )
}

export { StatCard }
