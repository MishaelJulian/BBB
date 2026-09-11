import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  className?: string
}

function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h1 className="text-3xl md:text-4xl font-display font-bold text-ink">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-muted">{description}</p>
      )}
    </div>
  )
}

export { PageHeader }
