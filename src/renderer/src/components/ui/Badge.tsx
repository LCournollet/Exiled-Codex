import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'bronze' | 'ember' | 'crimson' | 'neutral' | 'custom'
}

const TONES: Record<NonNullable<BadgeProps['tone']>, string> = {
  bronze: 'border-bronze-dark/60 text-gold-pale bg-bronze/10',
  ember: 'border-ember/40 text-ember-glow bg-ember/10',
  crimson: 'border-crimson/50 text-crimson-bright bg-crimson/10',
  neutral: 'border-stone-border text-ivory-dim bg-obsidian-800',
  custom: ''
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        TONES[tone],
        className
      )}
      {...props}
    />
  )
}
