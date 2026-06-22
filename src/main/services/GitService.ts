import { promises as fs } from 'fs'
import { join } from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import type { GitStatus, GitCommitInfo, GitFileChange, SyncLogEntry } from '@shared/types'
import type { VaultService } from './VaultService'
import { resolveInVault } from '../utils/paths'

const SYNC_LOG = 'metadata/sync-log.json'
const MAX_LOG = 50

/**
 * Thin, forgiving wrapper around the local Git binary (via simple-git).
 * GitHub is optional: every method degrades gracefully when there is no repo,
 * no remote, or Git itself is missing.
 */
export class GitService {
  constructor(private vault: VaultService) {}

  private git(): SimpleGit {
    return simpleGit({ baseDir: this.vault.requireRoot() })
  }

  async isAvailable(): Promise<boolean> {
    try {
      await simpleGit().version()
      return true
    } catch {
      return false
    }
  }

  async isRepo(): Promise<boolean> {
    try {
      return await this.git().checkIsRepo()
    } catch {
      return false
    }
  }

  async status(): Promise<GitStatus> {
    const empty: GitStatus = {
      isRepo: false,
      branch: null,
      hasRemote: false,
      remoteUrl: null,
      ahead: 0,
      behind: 0,
      clean: true,
      files: [],
      conflicted: []
    }
    if (!(await this.isRepo())) return empty

    const git = this.git()
    const status = await git.status()
    const remotes = await git.getRemotes(true).catch(() => [])
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]

    const files: GitFileChange[] = status.files.map((f) => ({
      path: f.path,
      state: mapState(f.index, f.working_dir)
    }))

    return {
      isRepo: true,
      branch: status.current ?? null,
      hasRemote: Boolean(origin),
      remoteUrl: origin?.refs?.fetch ?? null,
      ahead: status.ahead ?? 0,
      behind: status.behind ?? 0,
      clean: status.isClean(),
      files,
      conflicted: status.conflicted ?? []
    }
  }

  async init(): Promise<void> {
    const git = this.git()
    if (await this.isRepo()) return
    await git.init()
    // Default branch name to main for GitHub friendliness.
    await git.raw(['symbolic-ref', 'HEAD', 'refs/heads/main']).catch(() => undefined)
    await this.writeGitIgnore()
    await this.log({ action: 'init', message: 'Initialized Git repository', ok: true })
  }

  private async writeGitIgnore(): Promise<void> {
    const root = this.vault.requireRoot()
    const abs = resolveInVault(root, '.gitignore')
    try {
      await fs.access(abs)
    } catch {
      await fs.writeFile(abs, ['metadata/.trash/', '*.tmp', 'Thumbs.db', '.DS_Store', ''].join('\n'), 'utf-8')
    }
  }

  async setRemote(url: string): Promise<void> {
    const git = this.git()
    const remotes = await git.getRemotes().catch(() => [])
    if (remotes.find((r) => r.name === 'origin')) {
      await git.remote(['set-url', 'origin', url])
    } else {
      await git.addRemote('origin', url)
    }
    await this.log({ action: 'remote', message: `Set origin → ${url}`, ok: true })
  }

  async commit(message: string): Promise<{ committed: boolean; message: string }> {
    const git = this.git()
    if (!(await this.isRepo())) throw new Error('Not a Git repository. Initialize it first.')
    await git.add(['-A'])
    const status = await git.status()
    if (status.isClean()) {
      return { committed: false, message: 'Nothing to commit — working tree clean.' }
    }
    const res = await git.commit(message || 'Update vault')
    await this.log({ action: 'commit', message: `${message} (${res.commit})`, ok: true })
    return { committed: true, message: `Committed ${res.commit}` }
  }

  async push(): Promise<string> {
    const git = this.git()
    const status = await git.status()
    const branch = status.current ?? 'main'
    const remotes = await git.getRemotes().catch(() => [])
    if (!remotes.length) throw new Error('No remote configured. Set a GitHub remote first.')
    try {
      await git.push(['-u', 'origin', branch])
      await this.log({ action: 'push', message: `Pushed ${branch} → origin`, ok: true })
      return `Pushed ${branch} to origin.`
    } catch (err) {
      const msg = humanizeGitError(err)
      await this.log({ action: 'error', message: `Push failed: ${msg}`, ok: false })
      throw new Error(msg)
    }
  }

  async pull(): Promise<string> {
    const git = this.git()
    const remotes = await git.getRemotes().catch(() => [])
    if (!remotes.length) throw new Error('No remote configured. Set a GitHub remote first.')
    try {
      const res = await git.pull('origin', undefined, { '--no-rebase': null })
      const summary = `Pull complete: ${res.summary.changes} changes, ${res.summary.insertions} insertions, ${res.summary.deletions} deletions.`
      await this.log({ action: 'pull', message: summary, ok: true })
      return summary
    } catch (err) {
      const msg = humanizeGitError(err)
      await this.log({ action: 'error', message: `Pull failed: ${msg}`, ok: false })
      throw new Error(msg)
    }
  }

  /** One-click "Save to GitHub": add + commit + push. */
  async saveAll(message: string): Promise<string> {
    if (!(await this.isRepo())) throw new Error('Not a Git repository. Initialize it first.')
    const commit = await this.commit(message)
    const remotes = await this.git().getRemotes().catch(() => [])
    if (!remotes.length) {
      return `${commit.message} No remote set, so nothing was pushed.`
    }
    const push = await this.push()
    return `${commit.message} ${push}`
  }

  async recentCommits(limit = 15): Promise<GitCommitInfo[]> {
    if (!(await this.isRepo())) return []
    try {
      const log = await this.git().log({ maxCount: limit })
      return log.all.map((c) => ({
        hash: c.hash,
        shortHash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author_name,
        date: c.date
      }))
    } catch {
      return []
    }
  }

  async syncLog(): Promise<SyncLogEntry[]> {
    const root = this.vault.path
    if (!root) return []
    try {
      const raw = await fs.readFile(join(root, SYNC_LOG), 'utf-8')
      const parsed = JSON.parse(raw) as { entries: SyncLogEntry[] }
      return parsed.entries.slice(-MAX_LOG).reverse()
    } catch {
      return []
    }
  }

  private async log(entry: Omit<SyncLogEntry, 'at'>): Promise<void> {
    const root = this.vault.path
    if (!root) return
    const abs = join(root, SYNC_LOG)
    let entries: SyncLogEntry[] = []
    try {
      entries = (JSON.parse(await fs.readFile(abs, 'utf-8')) as { entries: SyncLogEntry[] }).entries
    } catch {
      entries = []
    }
    entries.push({ at: new Date().toISOString(), ...entry })
    await fs.writeFile(abs, JSON.stringify({ entries: entries.slice(-MAX_LOG) }, null, 2), 'utf-8').catch(() => undefined)
  }
}

function mapState(index: string, working: string): GitFileChange['state'] {
  const flag = (index + working).trim()
  if (index === 'U' || working === 'U' || flag === 'AA' || flag === 'DD') return 'conflicted'
  if (index === '?' || working === '?') return 'untracked'
  if (index === 'A') return 'added'
  if (index === 'D' || working === 'D') return 'deleted'
  if (index === 'R') return 'renamed'
  return 'modified'
}

/** Translate raw Git errors into something a non-Git user can act on. */
function humanizeGitError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (/Authentication failed|could not read Username|Permission denied|403/i.test(raw)) {
    return 'Authentication failed. Configure Git credentials (a credential manager, SSH key, or a Personal Access Token). See the README → GitHub setup.'
  }
  if (/Could not resolve host|unable to access|Failed to connect/i.test(raw)) {
    return 'Network error reaching the remote. Check your connection and the remote URL.'
  }
  if (/non-fast-forward|fetch first|rejected/i.test(raw)) {
    return 'Remote has changes you do not have yet. Pull from GitHub first, resolve any conflicts, then push again.'
  }
  if (/CONFLICT|Merge conflict|conflict/i.test(raw)) {
    return 'Merge conflict. Open the affected files, resolve the conflict markers (<<<<<<<), then commit.'
  }
  if (/no upstream|set-upstream/i.test(raw)) {
    return 'No upstream branch is set. The app pushes with -u to create it; try again or set the remote.'
  }
  return raw.split('\n').slice(0, 3).join(' ').trim()
}
