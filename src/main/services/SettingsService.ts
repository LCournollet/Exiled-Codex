import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import type { VaultSettings } from '@shared/types'
import { APP_NAME } from '@shared/appInfo'

const SETTINGS_FILE = 'exile-codex-settings.json'

const DEFAULTS: VaultSettings = {
  appName: APP_NAME,
  vaultPath: null,
  theme: 'dark',
  autoSave: true,
  autoSaveDelayMs: 1200,
  defaultGameVersion: '0.3',
  defaultLeague: 'Standard',
  recentVaults: []
}

/**
 * Persists app-level settings in Electron's userData folder (outside any vault),
 * so the app remembers the last vault, preferences, etc.
 */
export class SettingsService {
  private filePath: string
  private cache: VaultSettings | null = null

  constructor() {
    this.filePath = join(app.getPath('userData'), SETTINGS_FILE)
  }

  async get(): Promise<VaultSettings> {
    if (this.cache) return this.cache
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<VaultSettings>
      this.cache = { ...DEFAULTS, ...parsed }
    } catch {
      this.cache = { ...DEFAULTS }
    }
    return this.cache
  }

  async set(patch: Partial<VaultSettings>): Promise<VaultSettings> {
    const current = await this.get()
    const next: VaultSettings = { ...current, ...patch }
    this.cache = next
    await fs.writeFile(this.filePath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }

  async rememberVault(path: string): Promise<void> {
    const current = await this.get()
    const recent = [path, ...current.recentVaults.filter((p) => p !== path)].slice(0, 8)
    await this.set({ vaultPath: path, recentVaults: recent })
  }
}
