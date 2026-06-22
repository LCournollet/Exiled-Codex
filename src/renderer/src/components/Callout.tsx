import { ReactNode } from 'react'
import { Info, AlertTriangle, Flame, Lightbulb, Skull } from 'lucide-react'
import { cn } from '../lib/utils'

export type CalloutKind = 'note' | 'important' | 'tip' | 'warning' | 'danger'

const STYLES: Record<
  CalloutKind,
  { icon: typeof Info; cls: string; title: string; accent: string }
> = {
  note: { icon: Info, cls: 'border-stone-border bg-obsidian-800', title: 'Note', accent: 'text-ivory-dim' },
  important: {
    icon: Lightbulb,
    cls: 'border-bronze-dark/60 bg-bronze/10',
    title: 'Important',
    accent: 'text-gold-pale'
  },
  tip: {
    icon: Flame,
    cls: 'border-emerald-700/40 bg-emerald-900/15',
    title: 'Tip',
    accent: 'text-emerald-300'
  },
  warning: {
    icon: AlertTriangle,
    cls: 'border-ember/40 bg-ember/10',
    title: 'Warning',
    accent: 'text-ember-glow'
  },
  danger: {
    icon: Skull,
    cls: 'border-crimson/50 bg-crimson/10',
    title: 'Danger',
    accent: 'text-crimson-bright'
  }
}

export function Callout({
  kind,
  title,
  children
}: {
  kind: CalloutKind
  title?: string
  children: ReactNode
}) {
  const s = STYLES[kind] ?? STYLES.note
  const Icon = s.icon
  return (
    <div className={cn('my-4 rounded-lg border px-4 py-3', s.cls)}>
      <div className={cn('flex items-center gap-2 font-serif text-sm font-semibold mb-1', s.accent)}>
        <Icon size={16} />
        {title || s.title}
      </div>
      <div className="text-sm text-ivory-dim leading-relaxed [&>p]:my-1">{children}</div>
    </div>
  )
}
