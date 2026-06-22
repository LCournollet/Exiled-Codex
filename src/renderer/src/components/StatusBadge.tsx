import { Badge } from './ui/Badge'
import type { ContentStatus, ContentType } from '@shared/types'
import { STATUS_LABEL, STATUS_STYLE, TYPE_LABEL, cn } from '../lib/utils'

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Badge tone="custom" className={cn('border', STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function TypeBadge({ type }: { type: ContentType }) {
  return <Badge tone="bronze">{TYPE_LABEL[type]}</Badge>
}

export function ConfidenceDots({ level }: { level?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Confidence: ${level ?? 0}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            (level ?? 0) >= n ? 'bg-ember' : 'bg-stone-border'
          )}
        />
      ))}
    </span>
  )
}
