import { Search, FolderOpen, RefreshCw, Github, Download } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'
import { api, unwrap } from '../../lib/api'
import { useT } from '../../i18n'

export function Topbar() {
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const navigate = useStore((s) => s.navigate)
  const refreshAll = useStore((s) => s.refreshAll)
  const reveal = () => api.vault.reveal()
  const toast = useStore((s) => s.toast)
  const gitStatus = useStore((s) => s.gitStatus)
  const { t } = useT()

  const importBuild = async () => {
    try {
      const item = await unwrap(api.content.importBuildJson())
      if (!item) return
      await refreshAll()
      navigate('detail', { relPath: item.relPath })
      toast('success', t('settings.importedBuild', { title: item.title }))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 border-b border-stone-border bg-obsidian-900/60 px-4">
      <div className="relative flex-1 max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => navigate('library')}
          placeholder={t('topbar.search')}
          className="w-full bg-obsidian-800 border border-stone-border rounded-md pl-9 pr-3 py-2 text-sm text-ivory placeholder:text-ivory-faint focus:outline-none focus:border-bronze-dark focus:ring-1 focus:ring-bronze/40"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={importBuild} title={t('topbar.importBuildTitle')}>
          <Download size={15} />
          {t('topbar.importBuild')}
        </Button>
        <Button variant="ghost" size="icon" onClick={reveal} title={t('topbar.revealVault')}>
          <FolderOpen size={17} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => refreshAll()} title={t('common.refresh')}>
          <RefreshCw size={16} />
        </Button>
        <Button
          variant={gitStatus?.files.length ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => navigate('github')}
          title={t('topbar.githubTitle')}
        >
          <Github size={15} />
          {gitStatus?.files.length ? t('topbar.changes', { n: gitStatus.files.length }) : t('topbar.sync')}
        </Button>
      </div>
    </header>
  )
}
