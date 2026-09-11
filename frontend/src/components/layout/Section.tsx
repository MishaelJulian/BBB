import { cn } from '@/lib/utils'

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  size?: 'default' | 'sm' | 'lg'
}

function Section({ className, size = 'default', children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        size === 'default' && 'py-16 md:py-24',
        size === 'sm' && 'py-8 md:py-12',
        size === 'lg' && 'py-24 md:py-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export { Section }
