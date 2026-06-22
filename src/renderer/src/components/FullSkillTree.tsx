import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Loader2, Network } from 'lucide-react'
import { api } from '../lib/api'
import type { FullTree, FullTreeNode, PassiveKind, TreeAtlas } from '@shared/types'
import { Button } from './ui/Button'
import { useT } from '../i18n'

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

const ICON_WORLD = 280 // world units a notable icon spans at scale 1

// Relative on-screen size per node kind, so small passives read as dots and only
// notables / keystones show prominent icons (like the in-game tree).
const KIND_SIZE: Record<PassiveKind, number> = {
  keystone: 1.7,
  notable: 1.05,
  ascendancy: 1.0,
  mastery: 0.8,
  jewel: 0.6,
  small: 0.34
}
// Which kinds draw their sprite icon; the rest render as simple dots.
const KIND_SPRITE: Record<PassiveKind, boolean> = {
  keystone: true,
  notable: true,
  ascendancy: true,
  mastery: true,
  jewel: false,
  small: false
}

/** Camera: scale + the world point currently at the viewport center. */
interface View {
  scale: number
  cx: number
  cy: number
}

export function FullSkillTree({ allocatedIds }: { allocatedIds?: string[] }) {
  const { t } = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tree, setTree] = useState<FullTree | null>(fullCache)
  const [hasAtlas, setHasAtlas] = useState<boolean>(!!atlasCache)
  const [loading, setLoading] = useState(!fullCache)
  const [hover, setHover] = useState<{ node: FullTreeNode; px: number; py: number } | null>(null)

  const view = useRef<View>({ scale: 0.02, cx: 0, cy: 0 })
  const fitted = useRef(false)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const raf = useRef<number | null>(null)
  const allocated = useRef<Set<string>>(new Set())

  // ---- data load ----
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
          if (img.complete && img.naturalWidth > 0) atlasCache = { data, img }
        }
      }
      if (!active) return
      setTree(fullCache)
      setHasAtlas(!!atlasCache)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    allocated.current = new Set(allocatedIds ?? [])
    scheduleDraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocatedIds])

  /** CSS pixel size of the canvas right now (0 before layout). */
  const cssSize = () => {
    const c = canvasRef.current
    return c ? { w: c.clientWidth, h: c.clientHeight } : { w: 0, h: 0 }
  }

  const fit = useCallback(() => {
    if (!fullCache) return
    const { w, h } = cssSize()
    if (w === 0 || h === 0) return
    const b = fullCache.bounds
    const bw = b.maxX - b.minX || 1000
    const bh = b.maxY - b.minY || 1000
    const scale = Math.min((w / bw) * 0.92, (h / bh) * 0.92)
    view.current = { scale, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 }
    fitted.current = true
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !fullCache) return
    const { w: cssW, h: cssH } = cssSize()
    if (cssW === 0 || cssH === 0) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!fitted.current) fit()
    const v = view.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#08090b'
    ctx.fillRect(0, 0, cssW, cssH)

    const sx = (wx: number) => (wx - v.cx) * v.scale + cssW / 2
    const sy = (wy: number) => (wy - v.cy) * v.scale + cssH / 2

    const overlay = allocated.current.size > 0

    // Edges
    ctx.lineWidth = Math.max(0.4, 55 * v.scale)
    ctx.strokeStyle = 'rgba(95,80,46,0.45)'
    ctx.beginPath()
    for (const e of fullCache.edges) {
      const x1 = sx(e.x1)
      const y1 = sy(e.y1)
      const x2 = sx(e.x2)
      const y2 = sy(e.y2)
      if ((x1 < 0 && x2 < 0) || (x1 > cssW && x2 > cssW)) continue
      if ((y1 < 0 && y2 < 0) || (y1 > cssH && y2 > cssH)) continue
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()

    // Nodes — size differs by kind so the tree reads clearly.
    const baseIcon = Math.max(4, Math.min(ICON_WORLD * v.scale, 64))
    const img = atlasCache?.img
    const frames = atlasCache?.data.frames
    for (const n of fullCache.nodes) {
      const x = sx(n.x)
      const y = sy(n.y)
      const sz = baseIcon * KIND_SIZE[n.kind]
      const half = sz / 2
      if (x < -half || y < -half || x > cssW + half || y > cssH + half) continue
      const isAlloc = allocated.current.has(n.id)
      ctx.globalAlpha = overlay && !isAlloc ? 0.28 : 1

      if (isAlloc) {
        ctx.beginPath()
        ctx.arc(x, y, Math.max(half + 2.5, 4), 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(216,83,31,0.32)'
        ctx.fill()
      }

      const frame =
        KIND_SPRITE[n.kind] && img && frames && n.icon
          ? frames[`${STATE_PREFIX[n.kind]}:${n.icon}`]
          : undefined
      if (frame && img) {
        ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, x - half, y - half, sz, sz)
      } else {
        // Dot for small/jewel nodes (or any unresolved sprite).
        ctx.beginPath()
        ctx.arc(x, y, Math.max(1, half * (n.kind === 'small' ? 0.85 : 0.6)), 0, Math.PI * 2)
        ctx.fillStyle = KIND_COLOR[n.kind]
        ctx.fill()
      }

      if (isAlloc) {
        ctx.beginPath()
        ctx.arc(x, y, Math.max(half + 1.5, 3), 0, Math.PI * 2)
        ctx.strokeStyle = '#ff7a3c'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }, [fit])

  const scheduleDraw = useCallback(() => {
    if (raf.current != null) return
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      draw()
    })
  }, [draw])

  // Initial fit + redraw once data is ready and the element has a real size.
  useEffect(() => {
    if (!tree) return
    let tries = 0
    const tick = () => {
      const { w } = cssSize()
      if (w > 0) {
        fit()
        draw()
      } else if (tries++ < 20) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, hasAtlas])

  // Keep the backing store in sync on container resize (preserve current view).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => scheduleDraw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [scheduleDraw])

  // ---- interaction ----
  const zoomAt = (factor: number, px?: number, py?: number) => {
    const { w, h } = cssSize()
    const v = view.current
    const cxPx = px ?? w / 2
    const cyPx = py ?? h / 2
    const worldX = (cxPx - w / 2) / v.scale + v.cx
    const worldY = (cyPx - h / 2) / v.scale + v.cy
    v.scale = Math.max(0.004, Math.min(v.scale * factor, 0.6))
    v.cx = worldX - (cxPx - w / 2) / v.scale
    v.cy = worldY - (cyPx - h / 2) / v.scale
    scheduleDraw()
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top)
  }

  const hitTest = (px: number, py: number): FullTreeNode | null => {
    if (!fullCache) return null
    const { w, h } = cssSize()
    const v = view.current
    const wx = (px - w / 2) / v.scale + v.cx
    const wy = (py - h / 2) / v.scale + v.cy
    const r = ICON_WORLD * 0.55
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
      v.cx -= (e.clientX - drag.current.x) / v.scale
      v.cy -= (e.clientY - drag.current.y) / v.scale
      drag.current = { x: e.clientX, y: e.clientY, moved: true }
      if (hover) setHover(null)
      scheduleDraw()
      return
    }
    const node = hitTest(px, py)
    setHover(node ? { node, px, py } : null)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ivory-faint py-16 justify-center">
        <Loader2 className="animate-spin" size={16} /> {t('trees.loading')}
      </div>
    )
  }

  if (!tree || !tree.available) {
    return (
      <div className="text-sm text-ivory-faint rounded-md border border-stone-border bg-obsidian-800 p-4 flex items-center gap-2">
        <Network size={15} /> {t('trees.notBundled')}
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-stone-border overflow-hidden bg-obsidian-950">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button variant="subtle" size="icon" onClick={() => zoomAt(1.3)} title={t('trees.zoomIn')}>
          <ZoomIn size={15} />
        </Button>
        <Button variant="subtle" size="icon" onClick={() => zoomAt(1 / 1.3)} title={t('trees.zoomOut')}>
          <ZoomOut size={15} />
        </Button>
        <Button
          variant="subtle"
          size="icon"
          onClick={() => {
            fitted.current = false
            fit()
            scheduleDraw()
          }}
          title={t('trees.fit')}
        >
          <Maximize2 size={15} />
        </Button>
      </div>
      {!hasAtlas && (
        <div className="absolute top-2 left-2 z-10 text-[11px] text-ivory-faint bg-black/50 rounded px-2 py-1">
          {t('trees.iconsUnavailable')}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="block w-full h-[600px] cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onMouseDown={(e) => (drag.current = { x: e.clientX, y: e.clientY, moved: false })}
        onMouseMove={onMouseMove}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => {
          drag.current = null
          setHover(null)
        }}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs codex-panel p-2.5 text-xs"
          style={{ left: Math.min(hover.px + 14, 420), top: hover.py + 14 }}
        >
          <div className="font-serif text-gold-pale text-sm">{hover.node.name}</div>
          <div className="text-ivory-faint">{t(`kind.${hover.node.kind}`)}</div>
        </div>
      )}
    </div>
  )
}
