import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full bg-obsidian-800 border border-stone-border rounded-md px-3 py-2 text-sm text-ivory',
        'focus:outline-none focus:border-bronze-dark focus:ring-1 focus:ring-bronze/40 transition-colors',
        'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'
