import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-bronze to-bronze-dark text-obsidian-950 font-semibold border border-bronze-light/40 hover:from-bronze-light hover:to-bronze hover:glow-rune',
  secondary:
    'bg-stone-raised text-ivory border border-stone-border hover:border-bronze-dark hover:text-gold-pale',
  ghost: 'bg-transparent text-ivory-dim hover:bg-stone-raised hover:text-ivory border border-transparent',
  danger:
    'bg-gradient-to-b from-crimson-bright to-crimson text-ivory font-semibold border border-crimson-bright/40 hover:glow-ember',
  subtle: 'bg-obsidian-800 text-ivory-dim border border-stone-border hover:text-ivory'
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-md gap-2',
  lg: 'h-11 px-6 text-base rounded-lg gap-2',
  icon: 'h-9 w-9 rounded-md justify-center'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
