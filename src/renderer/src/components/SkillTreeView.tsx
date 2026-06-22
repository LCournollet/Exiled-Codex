import { useEffect, useMemo, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Network, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import type { AllocatedNode, PassiveKind, TreeSubgraph } from '@shared/types'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

const KIND_STYLE: Record<PassiveKind, { fill: string; stroke: string; r: number; label: string }> = {
  keystone: { fill: '#d8531f', stroke: '#ff7a3c', r: 2.6, label: 'Keystone' },
  notable: { fill: '#a9803f', stroke: '#d8c79a', r: 2.0, label: 'Notable' },
  ascendancy: { fill: '#8e2727', stroke: '#c2342f', r: 1.8, label: 'Ascendancy' },
  jewel: { fill: '#1b1f27', stroke: '#c79a55', r: 1.7, label: 'Jewel socket' },
  mastery: { fill: '#3f7a4a', stroke: '#7bbf86', r: 1.7, label: 'Mastery' },
  small: { fill: '#39414f', stroke: '#5a6577', r: 1.0, label: 'Small' }
}

interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export function SkillTreeView({ passiveIds }: { passiveIds: string[] }) {
  const [graph, setGraph] = useState<TreeSubgraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<{ node: AllocatedNode; px: number; py: number } | null>(null)
  const [vb, setVb] = useState<ViewBox | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)

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

  // Initial viewBox from bounds (with padding).
  const baseVb = useMemo<ViewBox | null>(() => {
    if (!graph || graph.nodes.length === 0) return null
    const { minX, minY, maxX, maxY } = graph.bounds
    const w = Math.max(maxX - minX, 100)
    const h = Math.max(maxY - minY, 100)
    const pad = Math.max(w, h) * 0.08
    return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 }
  }, [graph])

  useEffect(() => setVb(baseVb), [baseVb])

  const nodeScale = useMemo(() => (vb ? Math.max(vb.w, vb.h) / 90 : 1), [vb])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ivory-faint py-8 justify-center">
        <Loader2 className="animate-spin" size={16} /> Resolving passive tree…
      </div>
    )
  }

  if (!graph || !graph.available) {
    return (
      <div className="text-sm text-ivory-faint rounded-md border border-stone-border bg-obsidian-800 p-4">
        <p className="flex items-center gap-2 text-ivory-dim">
          <Network size={15} /> Passive-tree dataset not bundled.
        </p>
        <p className="mt-1 text-xs">
          Add <span className="font-mono text-bronze-light">resources/poe2-tree.json</span> to enable
          named passives and the visual tree. {graph?.summary.unresolved ?? passiveIds.length} allocated
          nodes detected in the import.
        </p>
      </div>
    )
  }

  if (graph.nodes.length === 0) {
    return <p className="text-sm text-ivory-faint">No passives allocated in this build.</p>
  }

  const zoom = (factor: number) => {
    setVb((cur) => {
      if (!cur) return cur
      const cx = cur.x + cur.w / 2
      const cy = cur.y + cur.h / 2
      const w = cur.w / factor
      const h = cur.h / factor
      return { x: cx - w / 2, y: cy - h / 2, w, h }
    })
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current || !vb || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = ((e.clientX - drag.current.x) / rect.width) * vb.w
    const dy = ((e.clientY - drag.current.y) / rect.height) * vb.h
    drag.current = { x: e.clientX, y: e.clientY }
    setVb({ ...vb, x: vb.x - dx, y: vb.y - dy })
  }
  const endDrag = () => (drag.current = null)

  const keystones = graph.nodes.filter((n) => n.kind === 'keystone')

  return (
    <div className="space-y-3">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="bronze">{graph.summary.total} passives</Badge>
        {graph.summary.keystones > 0 && <Badge tone="ember">{graph.summary.keystones} keystones</Badge>}
        <Badge tone="neutral">{graph.summary.notables} notables</Badge>
        {graph.summary.ascendancy > 0 && <Badge tone="crimson">{graph.summary.ascendancy} ascendancy</Badge>}
        {graph.summary.jewels > 0 && <Badge tone="neutral">{graph.summary.jewels} jewels</Badge>}
        {graph.summary.unresolved > 0 && (
          <Badge tone="neutral">{graph.summary.unresolved} unresolved</Badge>
        )}
      </div>

      {/* Canvas */}
      <div className="relative rounded-lg border border-stone-border bg-obsidian-950 overflow-hidden">
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button variant="subtle" size="icon" onClick={() => zoom(1.3)} title="Zoom in">
            <ZoomIn size={15} />
          </Button>
          <Button variant="subtle" size="icon" onClick={() => zoom(1 / 1.3)} title="Zoom out">
            <ZoomOut size={15} />
          </Button>
          <Button variant="subtle" size="icon" onClick={() => setVb(baseVb)} title="Reset view">
            <Maximize2 size={15} />
          </Button>
        </div>

        {vb && (
          <svg
            ref={svgRef}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            className="w-full h-[420px] cursor-grab active:cursor-grabbing select-none"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={() => {
              endDrag()
              setHover(null)
            }}
          >
            {/* Edges */}
            <g stroke="#4a3a22" strokeWidth={nodeScale * 0.35} strokeOpacity={0.6}>
              {graph.edges.map((e, i) => (
                <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
              ))}
            </g>
            {/* Nodes */}
            <g>
              {graph.nodes.map((n) => {
                const s = KIND_STYLE[n.kind]
                return (
                  <circle
                    key={n.id}
                    cx={n.x}
                    cy={n.y}
                    r={s.r * nodeScale}
                    fill={s.fill}
                    stroke={s.stroke}
                    strokeWidth={nodeScale * 0.25}
                    className="transition-opacity hover:opacity-100"
                    opacity={hover && hover.node.id !== n.id ? 0.55 : 1}
                    onMouseEnter={(ev) => {
                      const rect = svgRef.current?.getBoundingClientRect()
                      setHover({
                        node: n,
                        px: rect ? ev.clientX - rect.left : 0,
                        py: rect ? ev.clientY - rect.top : 0
                      })
                    }}
                  />
                )
              })}
            </g>
          </svg>
        )}

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-20 max-w-xs codex-panel p-2.5 text-xs"
            style={{
              left: Math.min(hover.px + 12, 320),
              top: hover.py + 12
            }}
          >
            <div className="font-serif text-gold-pale text-sm">{hover.node.name}</div>
            <div className="text-ivory-faint capitalize mb-1">
              {KIND_STYLE[hover.node.kind].label}
              {hover.node.ascendancyId ? ` · ${hover.node.ascendancyId}` : ''}
            </div>
            {hover.node.stats.length > 0 && (
              <ul className="text-ivory-dim space-y-0.5">
                {hover.node.stats.map((st, i) => (
                  <li key={i}>{cleanStat(st)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-ivory-faint">
        Scroll to zoom · drag to pan · hover a node for details.
      </p>

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
