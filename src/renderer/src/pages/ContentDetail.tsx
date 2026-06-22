import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Pencil,
  Star,
  Trash2,
  Share2,
  ExternalLink as LinkIcon,
  Maximize2,
  Minimize2,
  GitBranch
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, unwrap } from '../lib/api'
import type { BuildGuide, ContentItem } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Panel, SectionTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MarkdownView } from '../components/MarkdownView'
import { VaultImage } from '../components/VaultImage'
import { ImageViewer } from '../components/ImageViewer'
import { StatusBadge, TypeBadge, ConfidenceDots } from '../components/StatusBadge'
import { SkillTreeView } from '../components/SkillTreeView'
import { ConfirmDialog } from '../components/ui/Modal'
import { TYPE_LABEL, BUDGET_LABEL, formatDate, confidenceLabel, cn } from '../lib/utils'

const BUILD_VIEW: Array<{ key: keyof BuildGuide; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'pros', label: 'Pros' },
  { key: 'cons', label: 'Cons' },
  { key: 'priorityStats', label: 'Priority stats' },
  { key: 'leveling', label: 'Leveling' },
  { key: 'mainSkills', label: 'Main skill gems' },
  { key: 'supportSkills', label: 'Support gems' },
  { key: 'gear', label: 'Recommended gear' },
  { key: 'uniques', label: 'Key uniques' },
  { key: 'defenses', label: 'Defenses' },
  { key: 'damage', label: 'Damage' },
  { key: 'passiveTree', label: 'Passive tree' },
  { key: 'variants', label: 'Variants' },
  { key: 'progressionEarly', label: 'Progression — early' },
  { key: 'progressionMid', label: 'Progression — mid' },
  { key: 'progressionEndgame', label: 'Progression — endgame' },
  { key: 'testNotes', label: 'Test notes' }
]

export function ContentDetail() {
  const route = useStore((s) => s.route)
  const navigate = useStore((s) => s.navigate)
  const deleteItem = useStore((s) => s.deleteItem)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const refreshContent = useStore((s) => s.refreshContent)
  const toast = useStore((s) => s.toast)

  const [item, setItem] = useState<ContentItem | null>(null)
  const [viewer, setViewer] = useState<{ path: string; caption?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reading, setReading] = useState(false)

  const load = () => {
    if (route.relPath && route.relPath !== 'new') {
      api.content.get(route.relPath).then((r) => r.ok && r.data && setItem(r.data))
    }
  }
  useEffect(load, [route.relPath])

  if (!item) return <div className="p-6 text-ivory-faint">Loading…</div>

  const buildEntries = item.build
    ? BUILD_VIEW.filter((s) => (item.build?.[s.key] as string)?.trim())
    : []

  const exportJson = async () => {
    try {
      const path = await unwrap(api.content.exportItem(item.relPath))
      if (path) toast('success', `Exported to ${path}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className={cn('mx-auto', reading ? 'max-w-3xl p-8' : 'max-w-6xl p-6')}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate('library')}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setReading((r) => !r)}>
          {reading ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          {reading ? 'Exit reading' : 'Reading mode'}
        </Button>
        <Button variant="ghost" size="sm" onClick={exportJson}>
          <Share2 size={15} /> Export
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await toggleFavorite(item.relPath)
            load()
          }}
          className={cn(item.favorite && 'text-ember')}
        >
          <Star size={18} fill={item.favorite ? 'currentColor' : 'none'} />
        </Button>
        {!reading && (
          <>
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} />
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('editor', { relPath: item.relPath })}>
              <Pencil size={15} /> Edit
            </Button>
          </>
        )}
      </div>

      {/* Title block */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
          {item.build?.budget && <Badge tone="ember">{BUDGET_LABEL[item.build.budget]}</Badge>}
          <ConfidenceDots level={item.confidence} />
          <span className="text-xs text-ivory-faint">{confidenceLabel(item.confidence)}</span>
        </div>
        <h1 className="font-serif text-3xl text-gradient-bronze font-bold">{item.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ivory-faint">
          {item.className && <span>{item.className}</span>}
          {item.ascendancy && <span>· {item.ascendancy}</span>}
          {item.gameVersion && <span>· Patch {item.gameVersion}</span>}
          {item.league && <span>· {item.league}</span>}
          <span>· Updated {formatDate(item.updatedAt)}</span>
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map((t) => (
              <Badge key={t} tone="neutral">
                #{t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className={cn('grid gap-6', reading ? 'grid-cols-1' : 'lg:grid-cols-3')}>
        <div className={cn('space-y-6', !reading && 'lg:col-span-2')}>
          {/* Main content */}
          <Panel>
            <MarkdownView source={item.content} />
          </Panel>

          {/* Build sheet */}
          {buildEntries.length > 0 && (
            <Panel>
              <SectionTitle>
                <GitBranch size={18} /> Build sheet
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {buildEntries.map((s) => (
                  <div key={s.key}>
                    <h4 className="font-serif text-sm text-bronze-light uppercase tracking-wide mb-1">
                      {s.label}
                    </h4>
                    <MarkdownView source={(item.build?.[s.key] as string) ?? ''} className="text-sm" />
                  </div>
                ))}
              </div>
              {item.build?.imported && (
                <div className="mt-5 rounded-md border border-bronze-dark/40 bg-bronze/5 p-3 text-xs text-ivory-dim">
                  <span className="text-gold-pale font-medium">Imported export attached</span> —{' '}
                  {item.build.imported.passives?.length ?? 0} passive nodes,{' '}
                  {item.build.imported.skills?.length ?? 0} skill setups, preserved in the source file
                  for re-export.
                </div>
              )}
            </Panel>
          )}

          {/* Allocated passive tree (from an imported build export) */}
          {item.build?.imported?.passives && item.build.imported.passives.length > 0 && (
            <Panel>
              <SectionTitle>
                <GitBranch size={18} /> Allocated passive tree
              </SectionTitle>
              <SkillTreeView passiveIds={item.build.imported.passives.map((p) => p.id)} />
            </Panel>
          )}

          {/* Gallery */}
          {item.images.length > 0 && (
            <Panel>
              <SectionTitle>Gallery</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.images.map((img) => (
                  <figure key={img.path} className="space-y-1">
                    <VaultImage
                      relPath={img.path}
                      onClick={() => setViewer({ path: img.path, caption: img.caption })}
                      className="w-full h-32 object-cover rounded-md border border-stone-border hover:border-bronze-dark"
                    />
                    {img.caption && (
                      <figcaption className="text-xs text-ivory-faint text-center">{img.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Side panel */}
        {!reading && (
          <div className="space-y-4">
            {item.links.length > 0 && (
              <Panel>
                <SectionTitle>Links</SectionTitle>
                <ul className="space-y-1.5">
                  {item.links.map((l, i) => (
                    <li key={i}>
                      <button
                        onClick={() => api.openExternal(l.url)}
                        className="flex items-center gap-2 text-sm text-bronze-light hover:text-ember"
                      >
                        <LinkIcon size={14} /> <span className="truncate">{l.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {item.privateNotes && (
              <Panel>
                <SectionTitle>Private notes</SectionTitle>
                <p className="text-sm text-ivory-dim whitespace-pre-wrap">{item.privateNotes}</p>
              </Panel>
            )}

            <Panel>
              <SectionTitle>Details</SectionTitle>
              <dl className="text-sm space-y-1.5">
                <Row label="Type" value={TYPE_LABEL[item.type]} />
                <Row label="Created" value={formatDate(item.createdAt)} />
                <Row label="Updated" value={formatDate(item.updatedAt)} />
                <Row label="File" value={item.relPath} mono />
              </dl>
            </Panel>
          </div>
        )}
      </div>

      {viewer && (
        <ImageViewer relPath={viewer.path} caption={viewer.caption} onClose={() => setViewer(null)} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        message="It will be moved to the vault trash folder. You can recover it from disk if needed."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          await deleteItem(item.relPath)
          await refreshContent()
          navigate('library')
        }}
      />
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ivory-faint shrink-0">{label}</dt>
      <dd className={cn('text-ivory-dim text-right truncate', mono && 'font-mono text-xs')} title={value}>
        {value}
      </dd>
    </div>
  )
}
