import * as React from 'react'

import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseStyles =
  'inline-flex items-center justify-center rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-foreground text-background shadow-sm hover:bg-foreground/90 focus-visible:ring-foreground',
  outline:
    'border border-foreground/20 text-foreground hover:border-foreground/40 focus-visible:ring-foreground',
  ghost: 'text-foreground hover:bg-foreground/10 focus-visible:ring-foreground'
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-7 text-base'
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className)
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  )
)

Button.displayName = 'Button'
