import { useMemo, useState } from 'react'
import { LayoutGrid, List as ListIcon, Star, SlidersHorizontal, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ContentStatus, ContentSummary, ContentType } from '@shared/types'
import { CONTENT_STATUSES, CONTENT_TYPES } from '@shared/types'
import { ContentCard } from './ContentCard'
import { StatusBadge, TypeBadge, ConfidenceDots } from './StatusBadge'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { Badge } from './ui/Badge'
import { TYPE_LABEL, STATUS_LABEL, formatRelative, cn } from '../lib/utils'

type View = 'cards' | 'list'

interface Props {
  /** Lock the browser to a single type (hides the type filter). */
  lockType?: ContentType
  title: string
  subtitle?: string
}

export function ContentBrowser({ lockType, title, subtitle }: Props) {
  const all = useStore((s) => s.items)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const tagsAll = useStore((s) => s.tags)
  const navigate = useStore((s) => s.navigate)

  const [view, setView] = useState<View>('cards')
  const [type, setType] = useState<ContentType | 'all'>(lockType ?? 'all')
  const [status, setStatus] = useState<ContentStatus | 'all'>('all')
  const [className, setClassName] = useState('all')
  const [tag, setTag] = useState('all')
  const [favOnly, setFavOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const classes = useMemo(() => {
    const set = new Set<string>()
    all.forEach((i) => i.className && set.add(i.className))
    return [...set].sort()
  }, [all])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((i) => {
      if (lockType && i.type !== lockType) return false
      if (!lockType && type !== 'all' && i.type !== type) return false
      if (status !== 'all' && i.status !== status) return false
      if (className !== 'all' && i.className !== className) return false
      if (tag !== 'all' && !i.tags.includes(tag)) return false
      if (favOnly && !i.favorite) return false
      if (q) {
        const hay = `${i.title} ${i.excerpt} ${i.tags.join(' ')} ${i.className ?? ''} ${i.ascendancy ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [all, search, type, status, className, tag, favOnly, lockType])

  const newType = lockType ?? (type !== 'all' ? type : undefined)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-ivory-faint mt-1">{subtitle}</p>}
          <p className="text-xs text-ivory-faint mt-1">{filtered.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={15} /> Filters
          </Button>
          <div className="flex rounded-md border border-stone-border overflow-hidden">
            <button
              className={cn('px-2.5 py-2', view === 'cards' ? 'bg-stone-raised text-gold-pale' : 'text-ivory-faint')}
              onClick={() => setView('cards')}
              title="Card view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={cn('px-2.5 py-2', view === 'list' ? 'bg-stone-raised text-gold-pale' : 'text-ivory-faint')}
              onClick={() => setView('list')}
              title="List view"
            >
              <ListIcon size={15} />
            </button>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('editor', { relPath: 'new', newType })}>
            <Plus size={15} /> New
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="codex-panel p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {!lockType && (
            <LabeledSelect label="Type" value={type} onChange={(v) => setType(v as ContentType | 'all')}>
              <option value="all">All types</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </LabeledSelect>
          )}
          <LabeledSelect label="Status" value={status} onChange={(v) => setStatus(v as ContentStatus | 'all')}>
            <option value="all">Any status</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </LabeledSelect>
          <LabeledSelect label="Class" value={className} onChange={setClassName}>
            <option value="all">Any class</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </LabeledSelect>
          <LabeledSelect label="Tag" value={tag} onChange={setTag}>
            <option value="all">Any tag</option>
            {tagsAll.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </LabeledSelect>
          <label className="flex items-center gap-2 text-sm text-ivory-dim col-span-2 md:col-span-4">
            <input
              type="checkbox"
              checked={favOnly}
              onChange={(e) => setFavOnly(e.target.checked)}
              className="accent-ember"
            />
            <Star size={14} className="text-ember" /> Favorites only
            {(search || type !== (lockType ?? 'all') || status !== 'all' || className !== 'all' || tag !== 'all' || favOnly) && (
              <button
                className="ml-auto text-xs text-bronze-light underline"
                onClick={() => {
                  setSearch('')
                  setType(lockType ?? 'all')
                  setStatus('all')
                  setClassName('all')
                  setTag('all')
                  setFavOnly(false)
                }}
              >
                Reset filters
              </button>
            )}
          </label>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="codex-card p-10 text-center text-ivory-faint">
          Nothing matches. Try clearing filters or create a new entry.
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((i) => (
            <ContentCard key={i.relPath} item={i} />
          ))}
        </div>
      ) : (
        <ListView items={filtered} />
      )}
    </div>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] uppercase tracking-wide text-ivory-faint">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
    </label>
  )
}

function ListView({ items }: { items: ContentSummary[] }) {
  const navigate = useStore((s) => s.navigate)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  return (
    <div className="codex-panel p-0 overflow-hidden divide-y divide-stone-border">
      {items.map((i) => (
        <button
          key={i.relPath}
          onClick={() => navigate('detail', { relPath: i.relPath })}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-raised transition-colors text-left"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(i.relPath)
            }}
            className={cn('shrink-0', i.favorite ? 'text-ember' : 'text-ivory-faint hover:text-ember')}
          >
            <Star size={15} fill={i.favorite ? 'currentColor' : 'none'} />
          </button>
          <span className="font-medium text-ivory truncate flex-1">{i.title}</span>
          <TypeBadge type={i.type} />
          <StatusBadge status={i.status} />
          {i.tags.slice(0, 2).map((t) => (
            <Badge key={t} tone="neutral">
              #{t}
            </Badge>
          ))}
          <ConfidenceDots level={i.confidence} />
          <span className="text-xs text-ivory-faint w-20 text-right shrink-0">
            {formatRelative(i.updatedAt)}
          </span>
        </button>
      ))}
    </div>
  )
}
