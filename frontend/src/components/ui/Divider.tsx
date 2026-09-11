import { cn } from '@/lib/utils'

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'accent'
}

function Divider({ className, variant = 'default', ...props }: DividerProps) {
  return (
    <div
      role="separator"
      className={cn(
        'h-px w-full',
        variant === 'default' && 'bg-border',
        variant === 'dark' && 'bg-border-dark',
        variant === 'accent' && 'bg-accent',
        className
      )}
      {...props}
    />
  )
}

export { Divider }
