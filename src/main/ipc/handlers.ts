import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { ContentItem, Result, VaultSettings } from '@shared/types'
import {
  settingsService,
  vaultService,
  contentService,
  imageService,
  gitService,
  treeService
} from '../services'
import { seedDemoContent } from '../services/DemoSeeder'

/** Wrap a handler so every IPC call returns a uniform Result<T> instead of throwing across the bridge. */
function handle<T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_e, ...args): Promise<Result<T>> => {
    try {
      const data = await fn(...args)
      return { ok: true, data }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { ok: false, error }
    }
  })
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  // ---- Settings -------------------------------------------------------------
  handle(IPC.SETTINGS_GET, () => settingsService.get())
  handle(IPC.SETTINGS_SET, (patch) => settingsService.set(patch as Partial<VaultSettings>))

  // ---- Vault ----------------------------------------------------------------
  handle(IPC.VAULT_PICK_FOLDER, async () => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Choose a vault folder',
      properties: ['openDirectory', 'createDirectory']
    })
    return res.canceled ? null : res.filePaths[0]
  })

  handle(IPC.VAULT_OPEN, async (path) => {
    const opened = await vaultService.open(path as string)
    await settingsService.rememberVault(opened)
    return opened
  })

  handle(IPC.VAULT_CREATE, async (path) => {
    const created = await vaultService.create(path as string)
    await settingsService.rememberVault(created)
    return created
  })

  handle(IPC.VAULT_CURRENT, () => vaultService.path)
  handle(IPC.VAULT_STRUCTURE, () => vaultService.structure())
  handle(IPC.VAULT_SEED_DEMO, () => seedDemoContent(contentService))
  handle(IPC.VAULT_REVEAL, async () => {
    const p = vaultService.path
    if (p) await shell.openPath(p)
    return p
  })

  // ---- Content --------------------------------------------------------------
  handle(IPC.CONTENT_LIST, () => contentService.list())
  handle(IPC.CONTENT_GET, (relPath) => contentService.get(relPath as string))
  handle(IPC.CONTENT_SAVE, (item) => contentService.save(item as ContentItem))
  handle(IPC.CONTENT_DELETE, (relPath) => contentService.delete(relPath as string))
  handle(IPC.CONTENT_TOGGLE_FAVORITE, (relPath) => contentService.toggleFavorite(relPath as string))
  handle(IPC.CONTENT_EXPORT, async (relPath) => {
    const json = await contentService.exportItem(relPath as string)
    const win = getWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Export entry as JSON',
      defaultPath: 'exile-codex-entry.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return null
    const { promises: fs } = await import('fs')
    await fs.writeFile(res.filePath, json, 'utf-8')
    return res.filePath
  })

  handle(IPC.CONTENT_IMPORT, async () => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Import an Exile Codex entry (JSON)',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    const { promises: fs } = await import('fs')
    const json = await fs.readFile(res.filePaths[0], 'utf-8')
    return contentService.importItem(json)
  })

  handle(IPC.CONTENT_IMPORT_BUILD_JSON, async (rawJson) => {
    if (typeof rawJson === 'string' && rawJson.trim()) {
      return contentService.importBuildJson(rawJson)
    }
    // No inline JSON: open a file picker.
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Import a build export (JSON)',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    const { promises: fs } = await import('fs')
    const json = await fs.readFile(res.filePaths[0], 'utf-8')
    return contentService.importBuildJson(json)
  })

  // ---- Tags -----------------------------------------------------------------
  handle(IPC.TAGS_ALL, () => contentService.allTags())

  // ---- Images ---------------------------------------------------------------
  handle(IPC.IMAGE_PICK_AND_ADD, async (category) => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Add images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }]
    })
    if (res.canceled) return []
    const cat = (category as 'images' | 'trees' | 'icons') || 'images'
    const added: string[] = []
    for (const p of res.filePaths) {
      added.push(await imageService.addFromPath(p, cat))
    }
    return added
  })
  handle(IPC.IMAGE_DATA_URL, (relPath) => imageService.dataUrl(relPath as string))
  handle(IPC.IMAGE_LIST, () => imageService.list())
  handle(IPC.IMAGE_DELETE, (relPath) => imageService.delete(relPath as string))

  // ---- Skill tree -----------------------------------------------------------
  handle(IPC.TREE_AVAILABLE, () => treeService.available())
  handle(IPC.TREE_RESOLVE, (ids) => treeService.resolveBuild((ids as string[]) ?? []))

  // ---- Git ------------------------------------------------------------------
  handle(IPC.GIT_STATUS, () => gitService.status())
  handle(IPC.GIT_INIT, () => gitService.init())
  handle(IPC.GIT_SET_REMOTE, (url) => gitService.setRemote(url as string))
  handle(IPC.GIT_COMMIT, (message) => gitService.commit(message as string))
  handle(IPC.GIT_PUSH, () => gitService.push())
  handle(IPC.GIT_PULL, () => gitService.pull())
  handle(IPC.GIT_SAVE_ALL, (message) => gitService.saveAll(message as string))
  handle(IPC.GIT_LOG, () => gitService.recentCommits())
  handle(IPC.GIT_SYNC_LOG, () => gitService.syncLog())

  // ---- Misc -----------------------------------------------------------------
  handle(IPC.OPEN_EXTERNAL, async (url) => {
    await shell.openExternal(url as string)
    return true
  })
}
