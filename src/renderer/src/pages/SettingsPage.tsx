import { useState } from 'react'
import { FolderOpen, FolderPlus, Save, Upload, Download, Sparkles, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, unwrap } from '../lib/api'
import { Panel, SectionTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Field } from '../components/ui/Input'
import { appConfig } from '../config/app.config'

export function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const vaultPath = useStore((s) => s.vaultPath)
  const updateSettings = useStore((s) => s.updateSettings)
  const refreshAll = useStore((s) => s.refreshAll)
  const navigate = useStore((s) => s.navigate)
  const toast = useStore((s) => s.toast)
  const createVault = useStore((s) => s.pickAndCreateVault)
  const openVault = useStore((s) => s.pickAndOpenVault)

  const [gameVersion, setGameVersion] = useState(settings?.defaultGameVersion ?? '')
  const [league, setLeague] = useState(settings?.defaultLeague ?? '')

  const importEntry = async () => {
    try {
      const item = await unwrap(api.content.importItem())
      if (!item) return
      await refreshAll()
      navigate('detail', { relPath: item.relPath })
      toast('success', `Imported “${item.title}”.`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const importBuild = async () => {
    try {
      const item = await unwrap(api.content.importBuildJson())
      if (!item) return
      await refreshAll()
      navigate('detail', { relPath: item.relPath })
      toast('success', `Imported build “${item.title}”.`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">Settings</h1>

      {/* Vault */}
      <Panel>
        <SectionTitle>Vault</SectionTitle>
        <Field label="Current vault folder">
          <div className="flex gap-2">
            <Input value={vaultPath ?? ''} readOnly className="font-mono text-xs" />
            <Button variant="secondary" size="icon" onClick={() => api.vault.reveal()} title="Reveal in Explorer">
              <FolderOpen size={16} />
            </Button>
          </div>
        </Field>
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={openVault}>
            <FolderOpen size={15} /> Open another vault
          </Button>
          <Button variant="secondary" size="sm" onClick={createVault}>
            <FolderPlus size={15} /> Create new vault
          </Button>
        </div>
      </Panel>

      {/* Defaults */}
      <Panel>
        <SectionTitle>Editing defaults</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default patch / version">
            <Input value={gameVersion} onChange={(e) => setGameVersion(e.target.value)} placeholder="0.3" />
          </Field>
          <Field label="Default league / season">
            <Input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Standard" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ivory-dim mt-4">
          <input
            type="checkbox"
            checked={settings?.autoSave ?? true}
            onChange={(e) => updateSettings({ autoSave: e.target.checked })}
            className="accent-ember"
          />
          Auto-save while editing existing entries
        </label>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={async () => {
            await updateSettings({ defaultGameVersion: gameVersion, defaultLeague: league })
            toast('success', 'Settings saved.')
          }}
        >
          <Save size={15} /> Save defaults
        </Button>
      </Panel>

      {/* Import / Export */}
      <Panel>
        <SectionTitle>Import &amp; export</SectionTitle>
        <p className="text-sm text-ivory-faint mb-3">
          Share strategies with other players via portable JSON, or import a build export (poe.ninja /
          in-game format).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={importEntry}>
            <Upload size={15} /> Import entry (JSON)
          </Button>
          <Button variant="secondary" size="sm" onClick={importBuild}>
            <Download size={15} /> Import build export (JSON)
          </Button>
        </div>
        <p className="text-xs text-ivory-faint mt-3">
          To export an entry, open it and use the <span className="text-bronze-light">Export</span> button.
        </p>
      </Panel>

      {/* Demo */}
      <Panel>
        <SectionTitle>
          <Sparkles size={17} /> Demo content
        </SectionTitle>
        <p className="text-sm text-ivory-faint mb-3">
          Add a few example entries (only if the vault is empty) to explore the app.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const n = await unwrap(api.vault.seedDemo())
            await refreshAll()
            toast(n > 0 ? 'success' : 'info', n > 0 ? `Added ${n} demo entries.` : 'Vault already has content.')
          }}
        >
          <Sparkles size={15} /> Seed demo content
        </Button>
      </Panel>

      {/* About */}
      <Panel>
        <SectionTitle>About</SectionTitle>
        <div className="flex items-center gap-4">
          <img src={appConfig.logo} alt="" className="h-14 w-14 rounded-lg ring-1 ring-bronze-dark/50" />
          <div className="text-sm">
            <div className="font-serif text-gold-pale text-base">{appConfig.name}</div>
            <div className="text-ivory-faint">Version {appConfig.version} · local-first knowledge vault</div>
            <button
              onClick={() => api.openExternal('https://github.com/LCournollet/Exiled-Codex')}
              className="text-bronze-light hover:text-ember inline-flex items-center gap-1 mt-1 text-xs"
            >
              <ExternalLink size={12} /> Project repository
            </button>
          </div>
        </div>
        <p className="text-xs text-ivory-faint mt-4">
          Original dark-fantasy theme. Not affiliated with or endorsed by any game publisher.
        </p>
      </Panel>
    </div>
  )
}
