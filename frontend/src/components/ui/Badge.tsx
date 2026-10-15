import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Status is coloured text, never a pill (docs/ux/ADR-ui-revamp.md section 5). Kept only so old imports still compile.
const badgeVariants = cva('inline-flex items-center text-sm font-semibold', {
  variants: {
    variant: {
      default: 'text-ink',
      secondary: 'text-ink-light',
      accent: 'text-accent',
      outline: 'text-muted',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
