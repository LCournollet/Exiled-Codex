import { Star, Clock } from 'lucide-react'
import type { ContentSummary } from '@shared/types'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { StatusBadge, TypeBadge, ConfidenceDots } from './StatusBadge'
import { useStore } from '../store/useStore'
import { formatRelative, cn } from '../lib/utils'
import { useT } from '../i18n'

export function ContentCard({ item }: { item: ContentSummary }) {
  const navigate = useStore((s) => s.navigate)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const { lang } = useT()

  return (
    <Card
      className="group flex flex-col gap-3 cursor-pointer hover:glow-rune"
      onClick={() => navigate('detail', { relPath: item.relPath })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(item.relPath)
          }}
          className={cn(
            'shrink-0 transition-colors',
            item.favorite ? 'text-ember' : 'text-ivory-faint hover:text-ember'
          )}
          aria-label="Toggle favorite"
        >
          <Star size={16} fill={item.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div>
        <h3 className="font-serif text-base text-gold-pale leading-snug group-hover:text-bronze-light line-clamp-2">
          {item.title}
        </h3>
        {item.excerpt && (
          <p className="mt-1 text-xs text-ivory-faint line-clamp-2 leading-relaxed">{item.excerpt}</p>
        )}
      </div>

      {(item.className || item.ascendancy || item.gameVersion) && (
        <div className="flex flex-wrap gap-1.5 text-[11px] text-ivory-faint">
          {item.className && <span>{item.className}</span>}
          {item.ascendancy && <span>· {item.ascendancy}</span>}
          {item.gameVersion && <span>· patch {item.gameVersion}</span>}
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((t) => (
            <Badge key={t} tone="neutral">
              #{t}
            </Badge>
          ))}
          {item.tags.length > 4 && <Badge tone="neutral">+{item.tags.length - 4}</Badge>}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-ivory-faint">
        <span className="inline-flex items-center gap-1">
          <Clock size={11} />
          {formatRelative(item.updatedAt, lang)}
        </span>
        <ConfidenceDots level={item.confidence} />
      </div>
    </Card>
  )
}
