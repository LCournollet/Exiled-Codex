/**
 * Shared domain types used by both the Electron main process and the React renderer.
 * Keeping them in one place guarantees the IPC contract stays in sync.
 */

export type ContentType =
  | 'starter'
  | 'build'
  | 'guide'
  | 'note'
  | 'tree'
  | 'farming'
  | 'bossing'
  | 'crafting'
  | 'atlas'
  | 'leveling'
  | 'class'
  | 'other'

export type ContentStatus = 'draft' | 'testing' | 'validated' | 'archived'

export type BudgetTier = 'low' | 'medium' | 'high'

/** Confidence / maturity of a guide, 1 (rough idea) → 5 (battle-tested). */
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5

export interface ExternalLink {
  label: string
  url: string
}

export interface ContentImage {
  /** Path relative to the vault root, e.g. "assets/images/foo.png". */
  path: string
  caption?: string
  /** Logical category: "tree", "gear", "screenshot", "diagram", ... */
  category?: string
}

export interface AttachedFile {
  path: string
  label?: string
}

/**
 * Structured build sheet. Stored inside a ContentItem's frontmatter under `build`.
 * Every textual section is Markdown so it can be rendered with the same pipeline.
 */
export interface BuildGuide {
  summary?: string
  pros?: string
  cons?: string
  leveling?: string
  mainSkills?: string
  supportSkills?: string
  gear?: string
  uniques?: string
  priorityStats?: string
  defenses?: string
  damage?: string
  passiveTree?: string
  variants?: string
  budget?: BudgetTier
  progressionEarly?: string
  progressionMid?: string
  progressionEndgame?: string
  testNotes?: string
  /** Raw imported build data (poe.ninja / in-game JSON export). */
  imported?: ImportedBuild
}

/** The JSON build-export shape (passives + skills) used by poe.ninja and the game. */
export interface ImportedBuild {
  name?: string
  author?: string
  ascendancy?: string
  passives?: Array<{ id: string }>
  skills?: Array<{
    id: string
    support_skills?: Array<{ id: string }>
  }>
  /** Anything else present in the source file is preserved here. */
  [key: string]: unknown
}

export interface ContentItem {
  id: string
  title: string
  type: ContentType
  className?: string
  ascendancy?: string
  gameVersion?: string
  league?: string
  tags: string[]
  status: ContentStatus
  favorite: boolean
  confidence?: ConfidenceLevel
  createdAt: string
  updatedAt: string
  /** Main Markdown content (body of the file). */
  content: string
  images: ContentImage[]
  links: ExternalLink[]
  attachments: AttachedFile[]
  /** Private notes, never meant for export/sharing. */
  privateNotes?: string
  /** Present when type === 'build' (but allowed on any item). */
  build?: BuildGuide
  /** Relative path of the markdown file inside the vault. */
  relPath: string
}

/** Lighter projection used for lists / search to avoid loading full bodies. */
export interface ContentSummary {
  id: string
  title: string
  type: ContentType
  className?: string
  ascendancy?: string
  gameVersion?: string
  league?: string
  tags: string[]
  status: ContentStatus
  favorite: boolean
  confidence?: ConfidenceLevel
  createdAt: string
  updatedAt: string
  relPath: string
  excerpt: string
}

export interface VaultSettings {
  appName: string
  vaultPath: string | null
  theme: 'dark'
  autoSave: boolean
  autoSaveDelayMs: number
  defaultGameVersion: string
  defaultLeague: string
  lastOpenedId?: string
  /** Remembered recent vault paths. */
  recentVaults: string[]
}

export interface GitFileChange {
  path: string
  /** index/working status, simplified: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted' */
  state: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'
}

export interface GitStatus {
  isRepo: boolean
  branch: string | null
  hasRemote: boolean
  remoteUrl: string | null
  ahead: number
  behind: number
  clean: boolean
  files: GitFileChange[]
  conflicted: string[]
}

export interface GitCommitInfo {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export interface SyncLogEntry {
  at: string
  action: 'commit' | 'push' | 'pull' | 'init' | 'remote' | 'error'
  message: string
  ok: boolean
}

/** Generic IPC result wrapper so the renderer can handle errors uniformly. */
export interface Result<T> {
  ok: boolean
  data?: T
  error?: string
}

export interface VaultStructure {
  root: string
  counts: Record<ContentType, number>
  total: number
}

export const CONTENT_TYPES: ContentType[] = [
  'starter',
  'build',
  'guide',
  'note',
  'tree',
  'leveling',
  'farming',
  'bossing',
  'crafting',
  'atlas',
  'class',
  'other'
]

export const CONTENT_STATUSES: ContentStatus[] = ['draft', 'testing', 'validated', 'archived']

/** Folder each content type is stored under, relative to vault/content. */
export const TYPE_FOLDER: Record<ContentType, string> = {
  starter: 'starters',
  build: 'builds',
  guide: 'guides',
  note: 'notes',
  tree: 'trees',
  leveling: 'leveling',
  farming: 'farming',
  bossing: 'bossing',
  crafting: 'crafting',
  atlas: 'atlas',
  class: 'classes',
  other: 'misc'
}
