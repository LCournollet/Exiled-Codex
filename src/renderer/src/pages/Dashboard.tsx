import { useEffect, useState } from 'react'
import { Star, FileEdit, Clock, GitCommit, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api } from '../lib/api'
import { appConfig } from '../config/app.config'
import { Panel, SectionTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ContentCard } from '../components/ContentCard'
import { TypeBadge } from '../components/StatusBadge'
import { formatRelative, TYPE_LABEL } from '../lib/utils'
import type { ContentSummary, GitCommitInfo } from '@shared/types'

export function Dashboard() {
  const items = useStore((s) => s.items)
  const structure = useStore((s) => s.structure)
  const navigate = useStore((s) => s.navigate)
  const vaultPath = useStore((s) => s.vaultPath)
  const [commits, setCommits] = useState<GitCommitInfo[]>([])

  useEffect(() => {
    api.git.log().then((r) => r.ok && setCommits(r.data ?? []))
  }, [items.length])

  const recent = items.slice(0, 6)
  const favorites = items.filter((i) => i.favorite).slice(0, 4)
  const drafts = items.filter((i) => i.status === 'draft').slice(0, 4)

  const topTypes = (['build', 'starter', 'guide', 'tree', 'farming', 'crafting'] as const).map((t) => ({
    type: t,
    count: structure?.counts[t] ?? 0
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <div className="codex-panel p-6 flex items-center gap-5 overflow-hidden relative">
        <img src={appConfig.logo} alt="" className="h-16 w-16 rounded-lg ring-1 ring-bronze-dark/50" />
        <div className="flex-1">
          <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">
            Welcome back to the Codex
          </h1>
          <p className="text-sm text-ivory-faint mt-1 truncate" title={vaultPath ?? ''}>
            {structure?.total ?? 0} entries · {vaultPath}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => navigate('editor', { relPath: 'new' })}>
            <Plus size={16} />
            New entry
          </Button>
        </div>
      </div>

      {/* Quick type tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {topTypes.map((t) => (
          <button
            key={t.type}
            onClick={() => navigate(quickRoute(t.type))}
            className="codex-card p-4 text-left hover:glow-rune"
          >
            <div className="text-3xl font-serif text-gradient-bronze">{t.count}</div>
            <div className="text-xs text-ivory-faint mt-1">{TYPE_LABEL[t.type]}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recently modified */}
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle>
            <Clock size={18} /> Recently modified
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyHint onCreate={() => navigate('editor', { relPath: 'new' })} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent.map((i) => (
                <ContentCard key={i.relPath} item={i} />
              ))}
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Panel>
            <SectionTitle>
              <Star size={17} /> Favorites
            </SectionTitle>
            <MiniList items={favorites} empty="Star entries to pin them here." />
          </Panel>

          <Panel>
            <SectionTitle>
              <FileEdit size={17} /> Drafts in progress
            </SectionTitle>
            <MiniList items={drafts} empty="No drafts — everything is polished." />
          </Panel>

          <Panel>
            <SectionTitle>
              <GitCommit size={17} /> Recent commits
            </SectionTitle>
            {commits.length === 0 ? (
              <p className="text-xs text-ivory-faint">
                No Git history yet.{' '}
                <button className="text-bronze-light underline" onClick={() => navigate('github')}>
                  Set up GitHub
                </button>
              </p>
            ) : (
              <ul className="space-y-2">
                {commits.slice(0, 5).map((c) => (
                  <li key={c.hash} className="text-xs">
                    <div className="text-ivory-dim truncate">{c.message}</div>
                    <div className="text-ivory-faint font-mono">
                      {c.shortHash} · {formatRelative(c.date)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function MiniList({ items, empty }: { items: ContentSummary[]; empty: string }) {
  const navigate = useStore((s) => s.navigate)
  if (items.length === 0) return <p className="text-xs text-ivory-faint">{empty}</p>
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.relPath}>
          <button
            onClick={() => navigate('detail', { relPath: i.relPath })}
            className="w-full text-left flex items-center gap-2 rounded px-2 py-1.5 hover:bg-stone-raised transition-colors"
          >
            <TypeBadge type={i.type} />
            <span className="text-sm text-ivory-dim truncate flex-1">{i.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function EmptyHint({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="codex-card p-8 text-center">
      <p className="text-sm text-ivory-faint mb-3">Your codex is empty. Forge your first entry.</p>
      <Button variant="primary" onClick={onCreate}>
        <Plus size={16} /> Create entry
      </Button>
    </div>
  )
}

function quickRoute(type: string) {
  if (type === 'build') return 'builds' as const
  if (type === 'starter') return 'starters' as const
  if (type === 'guide') return 'guides' as const
  if (type === 'tree') return 'trees' as const
  return 'library' as const
}
