import { promises as fs } from 'fs'
import { extname, basename, join } from 'path'
import type { VaultService } from './VaultService'
import { resolveInVault, toVaultRelative, slugify } from '../utils/paths'
import { newId } from '../utils/id'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml'
}

const IMAGE_EXTS = Object.keys(MIME)

/**
 * Copies images into the vault and serves them back to the renderer as data URLs
 * (the renderer is sandboxed and cannot read arbitrary files directly).
 */
export class ImageService {
  constructor(private vault: VaultService) {}

  isImage(path: string): boolean {
    return IMAGE_EXTS.includes(extname(path).toLowerCase())
  }

  /**
   * Copy an external image into the vault under assets/<category-dir>.
   * Returns the vault-relative path to store on a content item.
   */
  async addFromPath(sourcePath: string, category: 'images' | 'trees' | 'icons' = 'images'): Promise<string> {
    const root = this.vault.requireRoot()
    if (!this.isImage(sourcePath)) {
      throw new Error('Unsupported image type.')
    }
    const ext = extname(sourcePath).toLowerCase()
    const name = `${slugify(basename(sourcePath, ext))}-${newId()}${ext}`
    const relPath = `assets/${category}/${name}`
    const destAbs = resolveInVault(root, relPath)
    await fs.copyFile(sourcePath, destAbs)
    return relPath
  }

  async dataUrl(relPath: string): Promise<string> {
    const root = this.vault.requireRoot()
    const abs = resolveInVault(root, relPath)
    const buf = await fs.readFile(abs)
    const mime = MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream'
    return `data:${mime};base64,${buf.toString('base64')}`
  }

  /** List every image stored in the vault assets, grouped by category folder. */
  async list(): Promise<Array<{ path: string; category: string }>> {
    const root = this.vault.requireRoot()
    const cats = ['images', 'trees', 'icons']
    const out: Array<{ path: string; category: string }> = []
    for (const cat of cats) {
      const dir = resolveInVault(root, `assets/${cat}`)
      const files = await fs.readdir(dir).catch(() => [] as string[])
      for (const f of files) {
        if (this.isImage(f)) {
          out.push({ path: toVaultRelative(root, join(dir, f)), category: cat })
        }
      }
    }
    return out
  }

  async delete(relPath: string): Promise<void> {
    const root = this.vault.requireRoot()
    const abs = resolveInVault(root, relPath)
    const trashDir = resolveInVault(root, 'metadata/.trash')
    await fs.mkdir(trashDir, { recursive: true })
    await fs.rename(abs, join(trashDir, `${Date.now()}-${basename(abs)}`)).catch(() => fs.rm(abs, { force: true }))
  }
}
