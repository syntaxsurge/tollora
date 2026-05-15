import * as React from 'react'

import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'button-primary-gradient shadow-sm shadow-brand-blue/20 hover:translate-y-[-1px] hover:shadow-md hover:shadow-brand-orange/25 active:translate-y-0 active:shadow-sm',
  outline:
    'border border-border bg-card/80 text-foreground shadow-sm hover:border-brand-cyan/70 hover:bg-accent/10',
  ghost: 'text-foreground hover:bg-accent/10 hover:text-primary'
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
