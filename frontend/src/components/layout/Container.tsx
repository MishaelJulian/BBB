import { cn } from '@/lib/utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide'
}

function Container({ className, size = 'default', children, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        size === 'default' && 'max-w-library',
        size === 'narrow' && 'max-w-content',
        size === 'wide' && 'max-w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Container }
