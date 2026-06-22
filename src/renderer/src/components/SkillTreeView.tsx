import { useEffect, useState } from 'react'
import { Loader2, Network } from 'lucide-react'
import { api } from '../lib/api'
import type { TreeSubgraph } from '@shared/types'
import { Badge } from './ui/Badge'
import { FullSkillTree } from './FullSkillTree'
import { useT } from '../i18n'

/**
 * Build-detail view of an imported build's allocation: a summary + the full
 * in-game passive tree, opened zoomed on the allocated cluster with the
 * allocated nodes highlighted.
 */
export function SkillTreeView({ passiveIds }: { passiveIds: string[] }) {
  const { t } = useT()
  const [graph, setGraph] = useState<TreeSubgraph | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api.tree.resolve(passiveIds).then((r) => {
      if (!active) return
      setLoading(false)
      if (r.ok && r.data) setGraph(r.data)
    })
    return () => {
      active = false
    }
  }, [passiveIds])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ivory-faint py-8 justify-center">
        <Loader2 className="animate-spin" size={16} /> {t('subtree.resolving')}
      </div>
    )
  }

  if (!graph || !graph.available) {
    return (
      <div className="text-sm text-ivory-faint rounded-md border border-stone-border bg-obsidian-800 p-4">
        <p className="flex items-center gap-2 text-ivory-dim">
          <Network size={15} /> {t('subtree.notBundled')}
        </p>
        <p className="mt-1 text-xs">
          {t('subtree.addToEnable', { n: graph?.summary.unresolved ?? passiveIds.length })}
        </p>
      </div>
    )
  }

  if (graph.nodes.length === 0) {
    return <p className="text-sm text-ivory-faint">{t('subtree.noPassives')}</p>
  }

  const keystones = graph.nodes.filter((n) => n.kind === 'keystone')

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="bronze">{t('subtree.passives', { n: graph.summary.total })}</Badge>
        {graph.summary.keystones > 0 && (
          <Badge tone="ember">{t('subtree.keystones', { n: graph.summary.keystones })}</Badge>
        )}
        <Badge tone="neutral">{t('subtree.notables', { n: graph.summary.notables })}</Badge>
        {graph.summary.ascendancy > 0 && (
          <Badge tone="crimson">{t('subtree.ascendancy', { n: graph.summary.ascendancy })}</Badge>
        )}
        {graph.summary.jewels > 0 && (
          <Badge tone="neutral">{t('subtree.jewels', { n: graph.summary.jewels })}</Badge>
        )}
        {graph.summary.unresolved > 0 && (
          <Badge tone="neutral">{t('subtree.unresolved', { n: graph.summary.unresolved })}</Badge>
        )}
      </div>

      {/* The full in-game tree, focused on this build's allocation */}
      <FullSkillTree allocatedIds={passiveIds} focusAllocated />
      <p className="text-[11px] text-ivory-faint">{t('subtree.hint')}</p>

      {/* Keystone callouts */}
      {keystones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {keystones.map((k) => (
            <div key={k.id} className="rounded-md border border-ember/30 bg-ember/5 p-2.5">
              <div className="text-sm font-medium text-ember-glow">{k.name}</div>
              {k.stats[0] && <div className="text-xs text-ivory-dim mt-0.5">{cleanStat(k.stats[0])}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Strip PoE markup like [DamagingAilments|Damaging Ailments] → "Damaging Ailments". */
function cleanStat(s: string): string {
  return s.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2').replace(/\[([^\]]+)\]/g, '$1')
}
