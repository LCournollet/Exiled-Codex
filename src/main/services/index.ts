import { SettingsService } from './SettingsService'
import { VaultService } from './VaultService'
import { ContentService } from './ContentService'
import { ImageService } from './ImageService'
import { GitService } from './GitService'

/** Lazily-constructed singletons wired together for the whole main process. */
export const settingsService = new SettingsService()
export const vaultService = new VaultService()
export const contentService = new ContentService(vaultService)
export const imageService = new ImageService(vaultService)
export const gitService = new GitService(vaultService)
