import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Loader2, Network } from 'lucide-react'
import { api } from '../lib/api'
import type { FullTree, FullTreeNode, PassiveKind, TreeAtlas } from '@shared/types'
import { Button } from './ui/Button'

// Module-level caches so the heavy data + atlas load only once per session.
let fullCache: FullTree | null = null
let atlasCache: { data: TreeAtlas; img: HTMLImageElement } | null = null

const STATE_PREFIX: Record<PassiveKind, string> = {
  keystone: 'keystoneActive',
  notable: 'notableActive',
  ascendancy: 'notableActive',
  mastery: 'normalActive',
  jewel: 'normalActive',
  small: 'normalActive'
}

const KIND_COLOR: Record<PassiveKind, string> = {
  keystone: '#d8531f',
  notable: '#a9803f',
  ascendancy: '#8e2727',
  mastery: '#3f7a4a',
  jewel: '#c79a55',
  small: '#5a6577'
}

const ICON_WORLD = 300 // world units a node icon spans at scale 1

interface View {
  scale: number
  ox: number // world x at viewport center
  oy: number
}

export function FullSkillTree({ allocatedIds }: { allocatedIds?: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tree, setTree] = useState<FullTree | null>(fullCache)
  const [atlas, setAtlas] = useState<{ data: TreeAtlas; img: HTMLImageElement } | null>(atlasCache)
  const [loading, setLoading] = useState(!fullCache)
  const [hover, setHover] = useState<{ node: FullTreeNode; px: number; py: number } | null>(null)

  const view = useRef<View>({ scale: 0.02, ox: 0, oy: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  const raf = useRef<number | null>(null)

  const allocated = useRef<Set<string>>(new Set())
  useEffect(() => {
    allocated.current = new Set(allocatedIds ?? [])
    scheduleDraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocatedIds])

  // Load data + atlas once.
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!fullCache) {
        const r = await api.tree.full()
        if (r.ok && r.data) fullCache = r.data
      }
      if (!atlasCache) {
        const a = await api.tree.atlas()
        const data = a.ok ? a.data : undefined
        if (data && data.available) {
          const img = new Image()
          await new Promise<void>((res) => {
            img.onload = () => res()
            img.onerror = () => res()
            img.src = data.dataUrl
          })
          atlasCache = { data, img }
        }
      }
      if (!active) return
      setTree(fullCache)
      setAtlas(atlasCache)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const fit = useCallback(() => {
    if (!fullCache || !size.current.w) return
    const b = fullCache.bounds
    const w = b.maxX - b.minX || 1000
    const h = b.maxY - b.minY || 1000
    const pad = 0.9
    const scale = Math.min((size.current.w / w) * pad, (size.current.h / h) * pad)
    view.current = { scale, ox: (b.minX + b.maxX) / 2, oy: (b.minY + b.maxY) / 2 }
    scheduleDraw()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !fullCache) return
    const { w, h, dpr } = size.current
    const v = view.current
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#08090b'
    ctx.fillRect(0, 0, w, h)

    const toScreenX = (wx: number) => (wx - v.ox) * v.scale + w / 2
    const toScreenY = (wy: number) => (wy - v.oy) * v.scale + h / 2

    const overlay = allocated.current.size > 0

    // Edges
    ctx.lineWidth = Math.max(0.5, 60 * v.scale)
    ctx.strokeStyle = 'rgba(74,58,34,0.5)'
    ctx.beginPath()
    for (const e of fullCache.edges) {
      const x1 = toScreenX(e.x1)
      const y1 = toScreenY(e.y1)
      const x2 = toScreenX(e.x2)
      const y2 = toScreenY(e.y2)
      if ((x1 < -50 && x2 < -50) || (x1 > w + 50 && x2 > w + 50)) continue
      if ((y1 < -50 && y2 < -50) || (y1 > h + 50 && y2 > h + 50)) continue
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()

    // Nodes
    const iconPx = Math.max(5, Math.min(ICON_WORLD * v.scale, 56))
    const half = iconPx / 2
    const img = atlasCache?.img
    const frames = atlasCache?.data.frames
    for (const n of fullCache.nodes) {
      const sx = toScreenX(n.x)
      const sy = toScreenY(n.y)
      if (sx < -30 || sy < -30 || sx > w + 30 || sy > h + 30) continue
      const isAlloc = allocated.current.has(n.id)
      ctx.globalAlpha = overlay && !isAlloc ? 0.32 : 1

      if (isAlloc) {
        ctx.beginPath()
        ctx.arc(sx, sy, half + 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(216,83,31,0.30)'
        ctx.fill()
      }

      const frame = img && frames && n.icon ? frames[`${STATE_PREFIX[n.kind]}:${n.icon}`] : undefined
      if (frame && img) {
        ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, sx - half, sy - half, iconPx, iconPx)
      } else {
        ctx.beginPath()
        ctx.arc(sx, sy, half * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = KIND_COLOR[n.kind]
        ctx.fill()
      }

      if (isAlloc) {
        ctx.beginPath()
        ctx.arc(sx, sy, half + 1.5, 0, Math.PI * 2)
        ctx.strokeStyle = '#ff7a3c'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }, [])

  const scheduleDraw = useCallback(() => {
    if (raf.current != null) return
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      draw()
    })
  }, [draw])

  // Size to container (devicePixelRatio aware).
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      size.current = { w: rect.width, h: rect.height, dpr }
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      if (view.current.ox === 0 && view.current.oy === 0) fit()
      else scheduleDraw()
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [fit, scheduleDraw])

  useEffect(() => {
    if (tree && atlas !== undefined) {
      fit()
      scheduleDraw()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, atlas])

  // Interaction
  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const v = view.current
    const { w, h } = size.current
    const px = cx ?? w / 2
    const py = cy ?? h / 2
    const worldX = (px - w / 2) / v.scale + v.ox
    const worldY = (py - h / 2) / v.scale + v.oy
    v.scale = Math.max(0.004, Math.min(v.scale * factor, 0.5))
    v.ox = worldX - (px - w / 2) / v.scale
    v.oy = worldY - (py - h / 2) / v.scale
    scheduleDraw()
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top)
  }

  const hitTest = (px: number, py: number): FullTreeNode | null => {
    if (!fullCache) return null
    const v = view.current
    const { w, h } = size.current
    const wx = (px - w / 2) / v.scale + v.ox
    const wy = (py - h / 2) / v.scale + v.oy
    const r = ICON_WORLD * 0.6
    let best: FullTreeNode | null = null
    let bestD = r * r
    for (const n of fullCache.nodes) {
      const dx = n.x - wx
      const dy = n.y - wy
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = n
      }
    }
    return best
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    if (drag.current) {
      const v = view.current
      v.ox -= (e.clientX - drag.current.x) / v.scale
      v.oy -= (e.clientY - drag.current.y) / v.scale
      drag.current = { x: e.clientX, y: e.clientY }
      scheduleDraw()
      return
    }
    const node = hitTest(px, py)
    setHover(node ? { node, px, py } : null)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ivory-faint py-16 justify-center">
        <Loader2 className="animate-spin" size={16} /> Loading passive tree…
      </div>
    )
  }

  if (!tree || !tree.available) {
    return (
      <div className="text-sm text-ivory-faint rounded-md border border-stone-border bg-obsidian-800 p-4 flex items-center gap-2">
        <Network size={15} /> Passive-tree dataset not bundled (resources/poe2-tree.json).
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-stone-border overflow-hidden bg-obsidian-950">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button variant="subtle" size="icon" onClick={() => zoomAt(1.3)} title="Zoom in">
          <ZoomIn size={15} />
        </Button>
        <Button variant="subtle" size="icon" onClick={() => zoomAt(1 / 1.3)} title="Zoom out">
          <ZoomOut size={15} />
        </Button>
        <Button variant="subtle" size="icon" onClick={fit} title="Fit to view">
          <Maximize2 size={15} />
        </Button>
      </div>
      {!atlas && (
        <div className="absolute top-2 left-2 z-10 text-[11px] text-ivory-faint bg-black/50 rounded px-2 py-1">
          Icons unavailable — showing colored nodes
        </div>
      )}
      <div ref={wrapRef} className="w-full h-[600px]">
        <canvas
          ref={canvasRef}
          className="cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onMouseDown={(e) => (drag.current = { x: e.clientX, y: e.clientY })}
          onMouseMove={onMouseMove}
          onMouseUp={() => (drag.current = null)}
          onMouseLeave={() => {
            drag.current = null
            setHover(null)
          }}
        />
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs codex-panel p-2.5 text-xs"
          style={{ left: Math.min(hover.px + 14, 420), top: hover.py + 14 }}
        >
          <div className="font-serif text-gold-pale text-sm">{hover.node.name}</div>
          <div className="text-ivory-faint capitalize">{hover.node.kind}</div>
        </div>
      )}
    </div>
  )
}
