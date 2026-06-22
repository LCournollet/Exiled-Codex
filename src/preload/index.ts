import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '@shared/ipc'
import type {
  ContentItem,
  ContentSummary,
  GitCommitInfo,
  GitStatus,
  Result,
  SyncLogEntry,
  TreeSubgraph,
  VaultSettings,
  VaultStructure
} from '@shared/types'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<Result<T>> =>
  ipcRenderer.invoke(channel, ...args)

/** The single, typed surface the renderer is allowed to touch. */
const api = {
  settings: {
    get: () => invoke<VaultSettings>(IPC.SETTINGS_GET),
    set: (patch: Partial<VaultSettings>) => invoke<VaultSettings>(IPC.SETTINGS_SET, patch)
  },
  vault: {
    pickFolder: () => invoke<string | null>(IPC.VAULT_PICK_FOLDER),
    open: (path: string) => invoke<string>(IPC.VAULT_OPEN, path),
    create: (path: string) => invoke<string>(IPC.VAULT_CREATE, path),
    current: () => invoke<string | null>(IPC.VAULT_CURRENT),
    structure: () => invoke<VaultStructure>(IPC.VAULT_STRUCTURE),
    seedDemo: () => invoke<number>(IPC.VAULT_SEED_DEMO),
    reveal: () => invoke<string | null>(IPC.VAULT_REVEAL)
  },
  content: {
    list: () => invoke<ContentSummary[]>(IPC.CONTENT_LIST),
    get: (relPath: string) => invoke<ContentItem>(IPC.CONTENT_GET, relPath),
    save: (item: ContentItem) => invoke<ContentItem>(IPC.CONTENT_SAVE, item),
    remove: (relPath: string) => invoke<void>(IPC.CONTENT_DELETE, relPath),
    toggleFavorite: (relPath: string) => invoke<ContentItem>(IPC.CONTENT_TOGGLE_FAVORITE, relPath),
    exportItem: (relPath: string) => invoke<string | null>(IPC.CONTENT_EXPORT, relPath),
    importItem: () => invoke<ContentItem | null>(IPC.CONTENT_IMPORT),
    importBuildJson: (rawJson?: string) =>
      invoke<ContentItem | null>(IPC.CONTENT_IMPORT_BUILD_JSON, rawJson ?? '')
  },
  tags: {
    all: () => invoke<string[]>(IPC.TAGS_ALL)
  },
  images: {
    pickAndAdd: (category?: 'images' | 'trees' | 'icons') =>
      invoke<string[]>(IPC.IMAGE_PICK_AND_ADD, category),
    dataUrl: (relPath: string) => invoke<string>(IPC.IMAGE_DATA_URL, relPath),
    list: () => invoke<Array<{ path: string; category: string }>>(IPC.IMAGE_LIST),
    remove: (relPath: string) => invoke<void>(IPC.IMAGE_DELETE, relPath)
  },
  git: {
    status: () => invoke<GitStatus>(IPC.GIT_STATUS),
    init: () => invoke<void>(IPC.GIT_INIT),
    setRemote: (url: string) => invoke<void>(IPC.GIT_SET_REMOTE, url),
    commit: (message: string) => invoke<{ committed: boolean; message: string }>(IPC.GIT_COMMIT, message),
    push: () => invoke<string>(IPC.GIT_PUSH),
    pull: () => invoke<string>(IPC.GIT_PULL),
    saveAll: (message: string) => invoke<string>(IPC.GIT_SAVE_ALL, message),
    log: () => invoke<GitCommitInfo[]>(IPC.GIT_LOG),
    syncLog: () => invoke<SyncLogEntry[]>(IPC.GIT_SYNC_LOG)
  },
  tree: {
    available: () => invoke<boolean>(IPC.TREE_AVAILABLE),
    resolve: (passiveIds: string[]) => invoke<TreeSubgraph>(IPC.TREE_RESOLVE, passiveIds)
  },
  openExternal: (url: string) => invoke<boolean>(IPC.OPEN_EXTERNAL, url)
}

export type ExileApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (fallback when context isolation is off)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
