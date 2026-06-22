import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import matter from 'gray-matter'
import type {
  ContentItem,
  ContentSummary,
  ContentType,
  ImportedBuild,
  BuildGuide
} from '@shared/types'
import { TYPE_FOLDER, CONTENT_TYPES } from '@shared/types'
import { resolveInVault, toVaultRelative, slugify } from '../utils/paths'
import { newId } from '../utils/id'
import { gemDisplayName } from '../utils/gemNames'
import type { VaultService } from './VaultService'
import type { TreeService } from './TreeService'

const CONTENT_DIR = 'content'
const TRASH_DIR = 'metadata/.trash'

/** Frontmatter shape persisted to disk (yaml). */
interface FrontMatter {
  id: string
  title: string
  type: ContentType
  class?: string
  ascendancy?: string
  gameVersion?: string
  league?: string
  tags?: string[]
  status?: ContentItem['status']
  favorite?: boolean
  confidence?: ContentItem['confidence']
  createdAt?: string
  updatedAt?: string
  images?: ContentItem['images']
  links?: ContentItem['links']
  attachments?: ContentItem['attachments']
  privateNotes?: string
  build?: BuildGuide
}

export class ContentService {
  constructor(
    private vault: VaultService,
    private tree?: TreeService
  ) {}

  private nowIso(): string {
    return new Date().toISOString()
  }

  private fileName(item: Pick<ContentItem, 'title' | 'id'>): string {
    return `${slugify(item.title)}-${item.id}.md`
  }

  private relPathFor(item: Pick<ContentItem, 'type' | 'title' | 'id'>): string {
    return `${CONTENT_DIR}/${TYPE_FOLDER[item.type]}/${this.fileName(item)}`
  }

  /** Parse a file's frontmatter + body into a full ContentItem. */
  private parse(fileContent: string, relPath: string): ContentItem {
    const parsed = matter(fileContent)
    const fm = parsed.data as FrontMatter
    return {
      id: fm.id || newId(),
      title: fm.title || 'Untitled',
      type: fm.type || 'note',
      className: fm.class,
      ascendancy: fm.ascendancy,
      gameVersion: fm.gameVersion,
      league: fm.league,
      tags: fm.tags ?? [],
      status: fm.status ?? 'draft',
      favorite: fm.favorite ?? false,
      confidence: fm.confidence,
      createdAt: fm.createdAt ?? this.nowIso(),
      updatedAt: fm.updatedAt ?? this.nowIso(),
      content: parsed.content.trimStart(),
      images: fm.images ?? [],
      links: fm.links ?? [],
      attachments: fm.attachments ?? [],
      privateNotes: fm.privateNotes,
      build: fm.build,
      relPath
    }
  }

  private serialize(item: ContentItem): string {
    const fm: FrontMatter = {
      id: item.id,
      title: item.title,
      type: item.type,
      class: item.className || undefined,
      ascendancy: item.ascendancy || undefined,
      gameVersion: item.gameVersion || undefined,
      league: item.league || undefined,
      tags: item.tags,
      status: item.status,
      favorite: item.favorite,
      confidence: item.confidence,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      images: item.images,
      links: item.links,
      attachments: item.attachments,
      privateNotes: item.privateNotes || undefined,
      build: item.build
    }
    // Strip undefined keys so the yaml stays clean.
    const record = fm as unknown as Record<string, unknown>
    Object.keys(record).forEach((k) => {
      if (record[k] === undefined) delete record[k]
    })
    return matter.stringify(`\n${item.content || ''}\n`, fm)
  }

  private excerpt(body: string): string {
    const plain = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`~\-]+/g, ' ')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
    return plain.slice(0, 180)
  }

  async list(): Promise<ContentSummary[]> {
    const root = this.vault.requireRoot()
    const out: ContentSummary[] = []
    for (const type of CONTENT_TYPES) {
      const dir = resolveInVault(root, `${CONTENT_DIR}/${TYPE_FOLDER[type]}`)
      const files = await fs.readdir(dir).catch(() => [] as string[])
      for (const f of files) {
        if (!f.endsWith('.md')) continue
        const abs = join(dir, f)
        try {
          const raw = await fs.readFile(abs, 'utf-8')
          const item = this.parse(raw, toVaultRelative(root, abs))
          out.push({
            id: item.id,
            title: item.title,
            type: item.type,
            className: item.className,
            ascendancy: item.ascendancy,
            gameVersion: item.gameVersion,
            league: item.league,
            tags: item.tags,
            status: item.status,
            favorite: item.favorite,
            confidence: item.confidence,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            relPath: item.relPath,
            excerpt: this.excerpt(item.content)
          })
        } catch {
          // Skip unreadable / malformed files rather than crash the whole list.
        }
      }
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return out
  }

  async get(relPath: string): Promise<ContentItem> {
    const root = this.vault.requireRoot()
    const abs = resolveInVault(root, relPath)
    const raw = await fs.readFile(abs, 'utf-8')
    return this.parse(raw, relPath)
  }

  /**
   * Create or update an item. If the title/type changed the file is renamed/moved
   * and the stale file removed, so the on-disk layout always matches metadata.
   */
  async save(input: ContentItem): Promise<ContentItem> {
    const root = this.vault.requireRoot()
    const now = this.nowIso()
    const item: ContentItem = {
      ...input,
      id: input.id || newId(),
      createdAt: input.createdAt || now,
      updatedAt: now,
      tags: input.tags ?? [],
      images: input.images ?? [],
      links: input.links ?? [],
      attachments: input.attachments ?? [],
      relPath: input.relPath || ''
    }

    const targetRel = this.relPathFor(item)
    const targetAbs = resolveInVault(root, targetRel)
    await fs.mkdir(dirname(targetAbs), { recursive: true })
    await fs.writeFile(targetAbs, this.serialize({ ...item, relPath: targetRel }), 'utf-8')

    // Remove the previous file if it moved.
    if (item.relPath && item.relPath !== targetRel) {
      const oldAbs = resolveInVault(root, item.relPath)
      await fs.rm(oldAbs, { force: true })
    }
    return { ...item, relPath: targetRel }
  }

  /** Move an item to the vault trash folder (recoverable) instead of hard-deleting. */
  async delete(relPath: string): Promise<void> {
    const root = this.vault.requireRoot()
    const abs = resolveInVault(root, relPath)
    const trashDir = resolveInVault(root, TRASH_DIR)
    await fs.mkdir(trashDir, { recursive: true })
    const base = relPath.split('/').pop() || `deleted-${newId()}.md`
    const dest = join(trashDir, `${Date.now()}-${base}`)
    await fs.rename(abs, dest).catch(async () => {
      // Cross-device fallback.
      await fs.copyFile(abs, dest)
      await fs.rm(abs, { force: true })
    })
  }

  async toggleFavorite(relPath: string): Promise<ContentItem> {
    const item = await this.get(relPath)
    item.favorite = !item.favorite
    return this.save(item)
  }

  async allTags(): Promise<string[]> {
    const items = await this.list()
    const set = new Set<string>()
    items.forEach((i) => i.tags.forEach((t) => set.add(t)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }

  /** Export a single item to a portable JSON string (for sharing strategies). */
  async exportItem(relPath: string): Promise<string> {
    const item = await this.get(relPath)
    const payload = {
      _format: 'exile-codex-content',
      _version: 1,
      item
    }
    return JSON.stringify(payload, null, 2)
  }

  /** Import an item previously exported by Exile Codex. Always creates a fresh id. */
  async importItem(json: string): Promise<ContentItem> {
    const parsed = JSON.parse(json)
    const incoming: Partial<ContentItem> = parsed?.item ?? parsed
    if (!incoming || typeof incoming !== 'object') {
      throw new Error('Invalid content JSON.')
    }
    const now = this.nowIso()
    const item: ContentItem = {
      id: newId(),
      title: incoming.title || 'Imported entry',
      type: (incoming.type as ContentType) || 'note',
      className: incoming.className,
      ascendancy: incoming.ascendancy,
      gameVersion: incoming.gameVersion,
      league: incoming.league,
      tags: incoming.tags ?? [],
      status: incoming.status ?? 'draft',
      favorite: false,
      confidence: incoming.confidence,
      createdAt: now,
      updatedAt: now,
      content: incoming.content ?? '',
      images: [], // referenced images aren't bundled in JSON; keep import safe
      links: incoming.links ?? [],
      attachments: [],
      privateNotes: incoming.privateNotes,
      build: incoming.build,
      relPath: ''
    }
    return this.save(item)
  }

  /**
   * Import a build from the poe.ninja / in-game JSON export (passives + skills).
   * Produces a ready-to-edit build sheet with the raw data preserved and a
   * human-readable summary of skills/supports generated from the metadata ids.
   */
  async importBuildJson(json: string): Promise<ContentItem> {
    // poe.ninja ".build" files are plain JSON; tolerate a BOM / surrounding whitespace.
    const cleaned = json.replace(/^﻿/, '').trim()
    let data: ImportedBuild
    try {
      data = JSON.parse(cleaned) as ImportedBuild
    } catch {
      throw new Error('Could not read the build file — it is not valid JSON.')
    }
    if (!data || (!data.passives && !data.skills)) {
      throw new Error('This does not look like a build export (no passives/skills).')
    }
    const now = this.nowIso()
    const title = data.name || 'Imported Build'

    const skillsMd = (data.skills ?? [])
      .map((s) => {
        const main = gemDisplayName(s.id)
        const supports = (s.support_skills ?? []).map((x) => `  - ${gemDisplayName(x.id)}`).join('\n')
        return `- **${main}**${supports ? `\n${supports}` : ''}`
      })
      .join('\n')

    // Resolve passives to readable names/stats when the tree dataset is available,
    // so the imported (and re-exported) build is self-documenting.
    const passiveIds = (data.passives ?? []).map((p) => p.id)
    const resolved = this.tree ? await this.tree.passiveMarkdown(passiveIds).catch(() => null) : null
    const passiveTree =
      resolved ??
      `Imported passive allocation: **${passiveIds.length} nodes**. See the raw data attached to this build.`

    const build: BuildGuide = {
      summary: `Imported from ${data.author || 'a JSON export'}.`,
      mainSkills: skillsMd || undefined,
      passiveTree,
      // poe.ninja / in-game exports carry only passives + gems — no items.
      gear: '_Gear is not included in this export — add your items and uniques here._',
      imported: data
    }

    const item: ContentItem = {
      id: newId(),
      title,
      type: 'build',
      ascendancy: data.ascendancy,
      tags: ['imported'],
      status: 'draft',
      favorite: false,
      createdAt: now,
      updatedAt: now,
      content: `# ${title}\n\nImported build. Fill in the leveling, gear and notes below.\n`,
      images: [],
      links: [],
      attachments: [],
      build,
      relPath: ''
    }
    return this.save(item)
  }
}
