import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { AllocatedNode, PassiveKind, TreeEdge, TreeSubgraph } from '@shared/types'

/** Shape of a node inside the bundled PoE2 passive-tree dataset (poe2-tree.json). */
interface RawNode {
  id?: string
  skill?: number
  name?: string
  stats?: string[]
  isNotable?: boolean
  isKeystone?: boolean
  isMastery?: boolean
  isJewelSocket?: boolean
  isAscendancyStart?: boolean
  ascendancyId?: string
  x?: number
  y?: number
  out?: string[]
  in?: string[]
}

interface RawTree {
  nodes: Record<string, RawNode>
}

/**
 * Loads the bundled Path of Exile 2 passive-tree export once and resolves a
 * build's allocated passive ids into named nodes + a drawable subgraph.
 * The dataset is optional: if it is missing, everything degrades to `available: false`.
 */
export class TreeService {
  private raw: RawTree | null = null
  private byStringId: Map<string, RawNode> | null = null
  private bySkill: Map<string, RawNode> | null = null
  private loadTried = false

  private dataPath(): string {
    return app.isPackaged
      ? join(process.resourcesPath, 'resources', 'poe2-tree.json')
      : join(app.getAppPath(), 'resources', 'poe2-tree.json')
  }

  private async load(): Promise<boolean> {
    if (this.raw) return true
    if (this.loadTried) return false
    this.loadTried = true
    try {
      const txt = await fs.readFile(this.dataPath(), 'utf-8')
      this.raw = JSON.parse(txt) as RawTree
      this.byStringId = new Map()
      this.bySkill = new Map()
      for (const [key, node] of Object.entries(this.raw.nodes)) {
        this.bySkill.set(key, node)
        if (node.skill != null) this.bySkill.set(String(node.skill), node)
        if (node.id) this.byStringId.set(node.id, node)
      }
      return true
    } catch {
      this.raw = null
      return false
    }
  }

  async available(): Promise<boolean> {
    return this.load()
  }

  private kindOf(n: RawNode): PassiveKind {
    if (n.isKeystone) return 'keystone'
    if (n.isJewelSocket) return 'jewel'
    if (n.isMastery) return 'mastery'
    if (n.isNotable) return 'notable'
    if (n.ascendancyId) return 'ascendancy'
    return 'small'
  }

  /** Resolve allocated passive ids into named nodes + edges for rendering. */
  async resolveBuild(passiveIds: string[]): Promise<TreeSubgraph> {
    const empty: TreeSubgraph = {
      available: false,
      nodes: [],
      edges: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      summary: {
        total: 0,
        keystones: 0,
        notables: 0,
        masteries: 0,
        jewels: 0,
        ascendancy: 0,
        smalls: 0,
        unresolved: 0
      }
    }
    if (!(await this.load()) || !this.byStringId || !this.bySkill) {
      return { ...empty, summary: { ...empty.summary, unresolved: passiveIds.length } }
    }

    const nodes: AllocatedNode[] = []
    const allocatedSkillKeys = new Set<string>()
    const rawBySkill = new Map<string, RawNode>()
    let unresolved = 0

    for (const id of passiveIds) {
      const n = this.byStringId.get(id)
      if (!n) {
        unresolved++
        continue
      }
      const skillKey = n.skill != null ? String(n.skill) : id
      allocatedSkillKeys.add(skillKey)
      rawBySkill.set(skillKey, n)
      nodes.push({
        id,
        name: n.name || id,
        kind: this.kindOf(n),
        stats: n.stats ?? [],
        x: n.x ?? 0,
        y: n.y ?? 0,
        ascendancyId: n.ascendancyId,
        isAscendancy: Boolean(n.ascendancyId)
      })
    }

    // Edges between two allocated nodes (dedup by ordered key).
    const edges: TreeEdge[] = []
    const seen = new Set<string>()
    for (const [skillKey, n] of rawBySkill) {
      const neighbours = [...(n.out ?? []), ...(n.in ?? [])]
      for (const other of neighbours) {
        if (!allocatedSkillKeys.has(other)) continue
        const pairKey = skillKey < other ? `${skillKey}-${other}` : `${other}-${skillKey}`
        if (seen.has(pairKey)) continue
        seen.add(pairKey)
        const a = n
        const b = rawBySkill.get(other) ?? this.bySkill.get(other)
        if (!b) continue
        edges.push({ x1: a.x ?? 0, y1: a.y ?? 0, x2: b.x ?? 0, y2: b.y ?? 0 })
      }
    }

    const xs = nodes.map((n) => n.x)
    const ys = nodes.map((n) => n.y)
    const bounds = {
      minX: xs.length ? Math.min(...xs) : 0,
      minY: ys.length ? Math.min(...ys) : 0,
      maxX: xs.length ? Math.max(...xs) : 0,
      maxY: ys.length ? Math.max(...ys) : 0
    }

    const count = (k: PassiveKind) => nodes.filter((n) => n.kind === k).length
    return {
      available: true,
      nodes,
      edges,
      bounds,
      summary: {
        total: nodes.length,
        keystones: count('keystone'),
        notables: count('notable'),
        masteries: count('mastery'),
        jewels: count('jewel'),
        ascendancy: nodes.filter((n) => n.isAscendancy).length,
        smalls: count('small'),
        unresolved
      }
    }
  }

  /** A compact Markdown summary of keystones + notables, for build import enrichment. */
  async passiveMarkdown(passiveIds: string[]): Promise<string | null> {
    const g = await this.resolveBuild(passiveIds)
    if (!g.available) return null
    const keystones = g.nodes.filter((n) => n.kind === 'keystone')
    const notables = g.nodes.filter((n) => n.kind === 'notable')
    const lines: string[] = []
    lines.push(
      `Allocated **${g.summary.total}** passives — ` +
        `${g.summary.keystones} keystones, ${g.summary.notables} notables, ` +
        `${g.summary.ascendancy} ascendancy, ${g.summary.jewels} jewel sockets.`
    )
    if (keystones.length) {
      lines.push('\n**Keystones**')
      keystones.forEach((k) => lines.push(`- **${k.name}**${k.stats[0] ? ` — ${k.stats[0]}` : ''}`))
    }
    if (notables.length) {
      lines.push('\n**Notables**')
      notables.forEach((n) => lines.push(`- ${n.name}`))
    }
    return lines.join('\n')
  }
}
