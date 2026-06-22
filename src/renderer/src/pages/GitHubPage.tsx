import { useEffect, useState } from 'react'
import {
  GitBranch,
  UploadCloud,
  DownloadCloud,
  GitCommit,
  Link2,
  RefreshCw,
  Save,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ExternalLink
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, unwrap } from '../lib/api'
import type { GitCommitInfo, SyncLogEntry } from '@shared/types'
import { Panel, SectionTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Field } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { GitStatusPanel } from '../components/GitStatusPanel'
import { appConfig } from '../config/app.config'
import { formatRelative } from '../lib/utils'
import { useT } from '../i18n'

export function GitHubPage() {
  const gitStatus = useStore((s) => s.gitStatus)
  const refreshGit = useStore((s) => s.refreshGit)
  const toast = useStore((s) => s.toast)
  const { t, lang } = useT()

  const [remoteUrl, setRemoteUrl] = useState('')
  const [commitMsg, setCommitMsg] = useState('')
  const [commits, setCommits] = useState<GitCommitInfo[]>([])
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const loadAux = async () => {
    const [log, sync] = await Promise.all([api.git.log(), api.git.syncLog()])
    if (log.ok) setCommits(log.data ?? [])
    if (sync.ok) setSyncLog(sync.data ?? [])
  }

  useEffect(() => {
    refreshGit()
    loadAux()
  }, [])

  useEffect(() => {
    if (gitStatus?.remoteUrl) setRemoteUrl(gitStatus.remoteUrl)
  }, [gitStatus?.remoteUrl])

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label)
    try {
      const msg = await fn()
      await refreshGit()
      await loadAux()
      if (msg) toast('success', msg)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const isRepo = gitStatus?.isRepo
  const hasRemote = gitStatus?.hasRemote

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">{t('github.title')}</h1>
          <p className="text-sm text-ivory-faint mt-1">{t('github.sub')}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => run('refresh', () => refreshGit())} title={t('github.refreshStatus')}>
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Status strip */}
      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={isRepo ? 'bronze' : 'neutral'}>
            <GitBranch size={12} /> {isRepo ? gitStatus?.branch ?? 'repo' : t('github.notRepo')}
          </Badge>
          {isRepo && (
            <>
              <Badge tone={gitStatus?.clean ? 'neutral' : 'ember'}>
                {gitStatus?.clean ? t('github.clean') : t('topbar.changes', { n: gitStatus?.files.length ?? 0 })}
              </Badge>
              {hasRemote ? (
                <Badge tone="bronze">
                  <Link2 size={12} /> {t('github.remoteSet')}
                </Badge>
              ) : (
                <Badge tone="neutral">{t('github.noRemote')}</Badge>
              )}
              {(gitStatus?.ahead ?? 0) > 0 && (
                <Badge tone="ember">
                  <ArrowUp size={12} /> {t('github.toPush', { n: gitStatus?.ahead ?? 0 })}
                </Badge>
              )}
              {(gitStatus?.behind ?? 0) > 0 && (
                <Badge tone="crimson">
                  <ArrowDown size={12} /> {t('github.toPull', { n: gitStatus?.behind ?? 0 })}
                </Badge>
              )}
            </>
          )}
        </div>

        {gitStatus?.conflicted && gitStatus.conflicted.length > 0 && (
          <div className="mt-3 rounded-md border border-crimson/50 bg-crimson/10 p-3 text-sm text-crimson-bright flex items-start gap-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{t('github.conflicts')}</p>
              <p className="text-ivory-dim text-xs mt-1">{t('github.conflictsHelp')}</p>
              <ul className="list-disc pl-5 mt-1 text-xs font-mono text-ivory-dim">
                {gitStatus.conflicted.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>

      {!isRepo ? (
        <Panel>
          <SectionTitle>
            <GitBranch size={18} /> {t('github.initTitle')}
          </SectionTitle>
          <p className="text-sm text-ivory-faint mb-4">{t('github.initSub')}</p>
          <Button variant="primary" onClick={() => run('init', () => api.git.init().then(unwrapVoid))} disabled={busy === 'init'}>
            <GitBranch size={16} /> {t('github.init')}
          </Button>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: changes + commit */}
          <div className="space-y-6">
            <Panel>
              <SectionTitle>{t('github.changes')}</SectionTitle>
              {gitStatus && <GitStatusPanel status={gitStatus} />}
              <div className="mt-4 space-y-2">
                <Field label={t('github.commitMsg')}>
                  <Input
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder={t('github.commitPlaceholder')}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      run('commit', async () => {
                        const res = await unwrap(api.git.commit(commitMsg || 'Update vault'))
                        return res.message
                      })
                    }
                    disabled={busy === 'commit' || gitStatus?.clean}
                  >
                    <GitCommit size={15} /> {t('github.commit')}
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => run('saveAll', () => api.git.saveAll(commitMsg || 'Update vault').then(unwrapStr))}
                    disabled={busy === 'saveAll'}
                  >
                    <Save size={15} /> {t('github.saveAll')}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel>
              <SectionTitle>{t('github.syncTitle')}</SectionTitle>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => run('push', () => api.git.push().then(unwrapStr))}
                  disabled={busy === 'push' || !hasRemote}
                >
                  <UploadCloud size={15} /> {t('github.push')}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => run('pull', () => api.git.pull().then(unwrapStr))}
                  disabled={busy === 'pull' || !hasRemote}
                >
                  <DownloadCloud size={15} /> {t('github.pull')}
                </Button>
              </div>
              {!hasRemote && (
                <p className="text-xs text-ivory-faint mt-2">{t('github.setRemoteFirst')}</p>
              )}
            </Panel>
          </div>

          {/* Right: remote + history */}
          <div className="space-y-6">
            <Panel>
              <SectionTitle>
                <Link2 size={18} /> {t('github.remoteTitle')}
              </SectionTitle>
              <p className="text-xs text-ivory-faint mb-3">
                {t('github.remoteHelp', { name: appConfig.suggestedRepoName })}
              </p>
              <Field label={t('github.remoteUrl')}>
                <Input
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/you/your-vault.git"
                />
              </Field>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="secondary"
                  onClick={() => run('remote', () => api.git.setRemote(remoteUrl).then(unwrapVoid))}
                  disabled={busy === 'remote' || !remoteUrl.trim()}
                >
                  <Link2 size={15} /> {t('github.saveRemote')}
                </Button>
                <button
                  onClick={() => api.openExternal('https://github.com/new')}
                  className="text-xs text-bronze-light hover:text-ember inline-flex items-center gap-1"
                >
                  <ExternalLink size={13} /> {t('github.createRepo')}
                </button>
              </div>
            </Panel>

            <Panel>
              <SectionTitle>
                <GitCommit size={18} /> {t('github.history')}
              </SectionTitle>
              {commits.length === 0 ? (
                <p className="text-xs text-ivory-faint">{t('github.noCommits')}</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {commits.map((c) => (
                    <li key={c.hash} className="text-xs border-b border-stone-border/60 pb-2">
                      <div className="text-ivory-dim">{c.message}</div>
                      <div className="text-ivory-faint font-mono">
                        {c.shortHash} · {c.author} · {formatRelative(c.date, lang)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <SectionTitle>{t('github.syncLog')}</SectionTitle>
              {syncLog.length === 0 ? (
                <p className="text-xs text-ivory-faint">{t('github.noSync')}</p>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {syncLog.map((e, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className={e.ok ? 'text-emerald-400' : 'text-crimson-bright'}>●</span>
                      <span className="text-ivory-dim flex-1">{e.message}</span>
                      <span className="text-ivory-faint shrink-0">{formatRelative(e.at, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

async function unwrapStr(r: { ok: boolean; data?: string; error?: string }): Promise<string> {
  if (!r.ok) throw new Error(r.error || 'Failed')
  return r.data ?? ''
}
async function unwrapVoid(r: { ok: boolean; error?: string }): Promise<void> {
  if (!r.ok) throw new Error(r.error || 'Failed')
}
