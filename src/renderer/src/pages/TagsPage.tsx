import { useMemo } from 'react'
import { Tag } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Panel } from '../components/ui/Card'
import { TypeBadge } from '../components/StatusBadge'
import { useT } from '../i18n'

export function TagsPage() {
  const items = useStore((s) => s.items)
  const setSearch = useStore((s) => s.setSearch)
  const navigate = useStore((s) => s.navigate)
  const { t } = useT()

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((i) => i.tags.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)))
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [items])

  const openTag = (tag: string) => {
    setSearch(tag) // the library search also matches tags
    navigate('library')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-serif text-2xl text-gradient-bronze font-semibold mb-1">{t('tags.title')}</h1>
      <p className="text-sm text-ivory-faint mb-5">{t('tags.count', { n: tagCounts.length })}</p>

      {tagCounts.length === 0 ? (
        <div className="codex-card p-10 text-center text-ivory-faint">{t('tags.empty')}</div>
      ) : (
        <Panel>
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => openTag(tag)}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-border bg-obsidian-800 px-3 py-1.5 text-sm text-ivory-dim hover:border-bronze-dark hover:text-gold-pale transition-colors"
                style={{ fontSize: `${Math.min(0.8 + count * 0.06, 1.2)}rem` }}
              >
                <Tag size={13} className="text-bronze-light" />
                {tag}
                <span className="text-ivory-faint text-xs">{count}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* Recently tagged */}
      <h2 className="font-serif text-lg text-gold-pale mt-8 mb-3">{t('tags.recent')}</h2>
      <div className="space-y-1.5">
        {items.slice(0, 8).map((i) => (
          <button
            key={i.relPath}
            onClick={() => navigate('detail', { relPath: i.relPath })}
            className="w-full flex items-center gap-2 rounded px-3 py-2 bg-obsidian-800 border border-stone-border hover:border-bronze-dark transition-colors text-left"
          >
            <TypeBadge type={i.type} />
            <span className="text-sm text-ivory-dim flex-1 truncate">{i.title}</span>
            <span className="text-xs text-ivory-faint">{i.tags.map((t) => `#${t}`).join(' ')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
