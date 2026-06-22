import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

const fieldBase =
  'w-full bg-obsidian-800 border border-stone-border rounded-md px-3 py-2 text-sm text-ivory placeholder:text-ivory-faint ' +
  'focus:outline-none focus:border-bronze-dark focus:ring-1 focus:ring-bronze/40 transition-colors'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'resize-y leading-relaxed', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'

export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ivory-faint">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ivory-faint">{hint}</span>}
    </label>
  )
}
