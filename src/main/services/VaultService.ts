import { promises as fs } from 'fs'
import { join } from 'path'
import type { VaultStructure, ContentType } from '@shared/types'
import { TYPE_FOLDER, CONTENT_TYPES } from '@shared/types'
import { resolveInVault } from '../utils/paths'

const CONTENT_DIR = 'content'
const ASSETS_DIR = 'assets'
const METADATA_DIR = 'metadata'

/** Sub-folders created inside the vault on init. */
const VAULT_FOLDERS = [
  ...Object.values(TYPE_FOLDER).map((f) => `${CONTENT_DIR}/${f}`),
  `${ASSETS_DIR}/images`,
  `${ASSETS_DIR}/trees`,
  `${ASSETS_DIR}/icons`,
  `${ASSETS_DIR}/files`,
  METADATA_DIR
]

/**
 * Owns the current vault location and its on-disk folder structure.
 * The vault is just a plain folder of Markdown + JSON, friendly to Git and
 * any text editor.
 */
export class VaultService {
  private root: string | null = null

  get path(): string | null {
    return this.root
  }

  requireRoot(): string {
    if (!this.root) throw new Error('No vault is open. Open or create one first.')
    return this.root
  }

  /** Point the service at an existing vault folder (validates it looks like one or scaffolds it). */
  async open(path: string): Promise<string> {
    const stat = await fs.stat(path).catch(() => null)
    if (!stat || !stat.isDirectory()) {
      throw new Error(`Folder does not exist: ${path}`)
    }
    this.root = path
    await this.ensureStructure()
    return path
  }

  /** Create a brand-new vault (folder may or may not already exist). */
  async create(path: string): Promise<string> {
    await fs.mkdir(path, { recursive: true })
    this.root = path
    await this.ensureStructure()
    await this.writeReadme()
    return path
  }

  /** Make sure all expected folders + metadata files exist. Safe to call repeatedly. */
  async ensureStructure(): Promise<void> {
    const root = this.requireRoot()
    for (const folder of VAULT_FOLDERS) {
      await fs.mkdir(resolveInVault(root, folder), { recursive: true })
    }
    await this.ensureJson(join(METADATA_DIR, 'tags.json'), { tags: [] })
    await this.ensureJson(join(METADATA_DIR, 'settings.json'), {
      createdWith: 'Exile Codex',
      schema: 1
    })
    await this.ensureJson(join(METADATA_DIR, 'sync-log.json'), { entries: [] })
  }

  private async ensureJson(relPath: string, fallback: unknown): Promise<void> {
    const root = this.requireRoot()
    const abs = resolveInVault(root, relPath)
    try {
      await fs.access(abs)
    } catch {
      await fs.writeFile(abs, JSON.stringify(fallback, null, 2), 'utf-8')
    }
  }

  private async writeReadme(): Promise<void> {
    const root = this.requireRoot()
    const abs = resolveInVault(root, 'README.md')
    const body = `# Exile Codex Vault

This folder is an **Exile Codex** vault. It contains your builds, guides, starters,
notes and images as plain Markdown + JSON, so it stays readable and Git-friendly.

\`\`\`
content/    Your entries, grouped by type (builds, guides, starters, ...)
assets/     Images, skill-tree captures, icons and attached files
metadata/   tags.json, settings.json, sync-log.json
\`\`\`

You can safely edit these files by hand or sync them with GitHub.
`
    try {
      await fs.access(abs)
    } catch {
      await fs.writeFile(abs, body, 'utf-8')
    }
  }

  async structure(): Promise<VaultStructure> {
    const root = this.requireRoot()
    const counts = {} as Record<ContentType, number>
    let total = 0
    for (const type of CONTENT_TYPES) {
      const dir = resolveInVault(root, `${CONTENT_DIR}/${TYPE_FOLDER[type]}`)
      const files = await fs.readdir(dir).catch(() => [] as string[])
      const n = files.filter((f) => f.endsWith('.md')).length
      counts[type] = n
      total += n
    }
    return { root, counts, total }
  }
}
