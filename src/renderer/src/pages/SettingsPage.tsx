import { useState } from 'react'
import { FolderOpen, FolderPlus, Save, Upload, Download, Sparkles, ExternalLink, Languages } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, unwrap } from '../lib/api'
import { Panel, SectionTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Field } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { appConfig } from '../config/app.config'
import { useT } from '../i18n'
import type { AppLanguage } from '@shared/types'

export function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const vaultPath = useStore((s) => s.vaultPath)
  const updateSettings = useStore((s) => s.updateSettings)
  const refreshAll = useStore((s) => s.refreshAll)
  const navigate = useStore((s) => s.navigate)
  const toast = useStore((s) => s.toast)
  const createVault = useStore((s) => s.pickAndCreateVault)
  const openVault = useStore((s) => s.pickAndOpenVault)
  const { t } = useT()

  const [gameVersion, setGameVersion] = useState(settings?.defaultGameVersion ?? '')
  const [league, setLeague] = useState(settings?.defaultLeague ?? '')

  const importEntry = async () => {
    try {
      const item = await unwrap(api.content.importItem())
      if (!item) return
      await refreshAll()
      navigate('detail', { relPath: item.relPath })
      toast('success', t('settings.imported', { title: item.title }))
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
      toast('success', t('settings.importedBuild', { title: item.title }))
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">{t('settings.title')}</h1>

      {/* Language */}
      <Panel>
        <SectionTitle>
          <Languages size={17} /> {t('settings.language')}
        </SectionTitle>
        <Select
          value={settings?.language ?? 'en'}
          onChange={(e) => updateSettings({ language: e.target.value as AppLanguage })}
          className="max-w-xs"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </Select>
        <p className="text-xs text-ivory-faint mt-2">{t('settings.languageHint')}</p>
      </Panel>

      {/* Vault */}
      <Panel>
        <SectionTitle>{t('settings.vault')}</SectionTitle>
        <Field label={t('settings.currentVault')}>
          <div className="flex gap-2">
            <Input value={vaultPath ?? ''} readOnly className="font-mono text-xs" />
            <Button variant="secondary" size="icon" onClick={() => api.vault.reveal()} title={t('settings.revealExplorer')}>
              <FolderOpen size={16} />
            </Button>
          </div>
        </Field>
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={openVault}>
            <FolderOpen size={15} /> {t('settings.openAnother')}
          </Button>
          <Button variant="secondary" size="sm" onClick={createVault}>
            <FolderPlus size={15} /> {t('settings.createNew')}
          </Button>
        </div>
      </Panel>

      {/* Defaults */}
      <Panel>
        <SectionTitle>{t('settings.editingDefaults')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('settings.defaultPatch')}>
            <Input value={gameVersion} onChange={(e) => setGameVersion(e.target.value)} placeholder="0.3" />
          </Field>
          <Field label={t('settings.defaultLeague')}>
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
          {t('settings.autoSave')}
        </label>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={async () => {
            await updateSettings({ defaultGameVersion: gameVersion, defaultLeague: league })
            toast('success', t('settings.saved'))
          }}
        >
          <Save size={15} /> {t('settings.saveDefaults')}
        </Button>
      </Panel>

      {/* Import / Export */}
      <Panel>
        <SectionTitle>{t('settings.importExport')}</SectionTitle>
        <p className="text-sm text-ivory-faint mb-3">{t('settings.importExportSub')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={importEntry}>
            <Upload size={15} /> {t('settings.importEntry')}
          </Button>
          <Button variant="secondary" size="sm" onClick={importBuild}>
            <Download size={15} /> {t('settings.importBuild')}
          </Button>
        </div>
        <p className="text-xs text-ivory-faint mt-3">{t('settings.exportHint')}</p>
      </Panel>

      {/* Demo */}
      <Panel>
        <SectionTitle>
          <Sparkles size={17} /> {t('settings.demo')}
        </SectionTitle>
        <p className="text-sm text-ivory-faint mb-3">{t('settings.demoSub')}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const n = await unwrap(api.vault.seedDemo())
            await refreshAll()
            toast(n > 0 ? 'success' : 'info', n > 0 ? t('settings.demoAdded', { n }) : t('settings.demoExists'))
          }}
        >
          <Sparkles size={15} /> {t('settings.seedDemo')}
        </Button>
      </Panel>

      {/* About */}
      <Panel>
        <SectionTitle>{t('settings.about')}</SectionTitle>
        <div className="flex items-center gap-4">
          <img src={appConfig.logo} alt="" className="h-14 w-14 rounded-lg ring-1 ring-bronze-dark/50" />
          <div className="text-sm">
            <div className="font-serif text-gold-pale text-base">{appConfig.name}</div>
            <div className="text-ivory-faint">{t('settings.aboutVersion', { v: appConfig.version })}</div>
            <button
              onClick={() => api.openExternal('https://github.com/LCournollet/Exiled-Codex')}
              className="text-bronze-light hover:text-ember inline-flex items-center gap-1 mt-1 text-xs"
            >
              <ExternalLink size={12} /> {t('settings.repo')}
            </button>
          </div>
        </div>
        <p className="text-xs text-ivory-faint mt-4">{t('settings.disclaimer')}</p>
      </Panel>
    </div>
  )
}
