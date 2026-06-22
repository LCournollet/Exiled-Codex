import { create } from 'zustand'
import type {
  ContentItem,
  ContentSummary,
  ContentType,
  GitStatus,
  VaultSettings,
  VaultStructure
} from '@shared/types'
import { api, unwrap } from '../lib/api'

export type PageId =
  | 'welcome'
  | 'dashboard'
  | 'library'
  | 'builds'
  | 'starters'
  | 'guides'
  | 'trees'
  | 'images'
  | 'tags'
  | 'github'
  | 'settings'
  | 'editor'
  | 'detail'

export interface RouteState {
  page: PageId
  /** relPath of the active item, or 'new' when creating. */
  relPath?: string
  /** Pre-selected content type when creating a new entry. */
  newType?: ContentType
}

export interface Toast {
  id: string
  kind: 'success' | 'error' | 'info'
  message: string
}

interface AppState {
  ready: boolean
  settings: VaultSettings | null
  vaultPath: string | null
  items: ContentSummary[]
  tags: string[]
  structure: VaultStructure | null
  gitStatus: GitStatus | null
  route: RouteState
  search: string
  toasts: Toast[]

  init: () => Promise<void>
  navigate: (page: PageId, opts?: Partial<RouteState>) => void
  setSearch: (q: string) => void

  pickAndCreateVault: () => Promise<void>
  pickAndOpenVault: () => Promise<void>
  openVault: (path: string) => Promise<void>

  refreshContent: () => Promise<void>
  refreshGit: () => Promise<void>
  refreshAll: () => Promise<void>

  saveItem: (item: ContentItem) => Promise<ContentItem>
  deleteItem: (relPath: string) => Promise<void>
  toggleFavorite: (relPath: string) => Promise<void>

  updateSettings: (patch: Partial<VaultSettings>) => Promise<void>

  toast: (kind: Toast['kind'], message: string) => void
  dismissToast: (id: string) => void
}

let toastCounter = 0

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  settings: null,
  vaultPath: null,
  items: [],
  tags: [],
  structure: null,
  gitStatus: null,
  route: { page: 'welcome' },
  search: '',
  toasts: [],

  init: async () => {
    try {
      const settings = await unwrap(api.settings.get())
      const vaultPath = await unwrap(api.vault.current())
      set({ settings, vaultPath })
      if (vaultPath) {
        await get().refreshAll()
        set({ route: { page: 'dashboard' } })
      }
    } catch (err) {
      get().toast('error', errMsg(err))
    } finally {
      set({ ready: true })
    }
  },

  navigate: (page, opts) => set({ route: { page, ...opts } }),
  setSearch: (q) => set({ search: q }),

  pickAndCreateVault: async () => {
    try {
      const folder = await unwrap(api.vault.pickFolder())
      if (!folder) return
      const path = await unwrap(api.vault.create(folder))
      await unwrap(api.vault.seedDemo())
      set({ vaultPath: path })
      await get().refreshAll()
      get().navigate('dashboard')
      get().toast('success', 'Vault created. A few demo entries were added to get you started.')
    } catch (err) {
      get().toast('error', errMsg(err))
    }
  },

  pickAndOpenVault: async () => {
    try {
      const folder = await unwrap(api.vault.pickFolder())
      if (!folder) return
      await get().openVault(folder)
    } catch (err) {
      get().toast('error', errMsg(err))
    }
  },

  openVault: async (path: string) => {
    try {
      const opened = await unwrap(api.vault.open(path))
      set({ vaultPath: opened })
      await get().refreshAll()
      get().navigate('dashboard')
      get().toast('success', 'Vault opened.')
    } catch (err) {
      get().toast('error', errMsg(err))
    }
  },

  refreshContent: async () => {
    const [items, tags, structure] = await Promise.all([
      unwrap(api.content.list()),
      unwrap(api.tags.all()),
      unwrap(api.vault.structure())
    ])
    set({ items, tags, structure })
  },

  refreshGit: async () => {
    try {
      const gitStatus = await unwrap(api.git.status())
      set({ gitStatus })
    } catch {
      set({ gitStatus: null })
    }
  },

  refreshAll: async () => {
    await Promise.all([get().refreshContent(), get().refreshGit()])
  },

  saveItem: async (item) => {
    const saved = await unwrap(api.content.save(item))
    await get().refreshContent()
    return saved
  },

  deleteItem: async (relPath) => {
    try {
      await unwrap(api.content.remove(relPath))
      await get().refreshContent()
      get().toast('success', 'Entry moved to vault trash.')
    } catch (err) {
      get().toast('error', errMsg(err))
    }
  },

  toggleFavorite: async (relPath) => {
    try {
      await unwrap(api.content.toggleFavorite(relPath))
      await get().refreshContent()
    } catch (err) {
      get().toast('error', errMsg(err))
    }
  },

  updateSettings: async (patch) => {
    const settings = await unwrap(api.settings.set(patch))
    set({ settings })
  },

  toast: (kind, message) => {
    const id = `t${++toastCounter}`
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4000)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
