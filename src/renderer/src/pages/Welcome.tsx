import { FolderPlus, FolderOpen, BookOpen, GitBranch, Shield } from 'lucide-react'
import { useStore } from '../store/useStore'
import { appConfig } from '../config/app.config'
import { Button } from '../components/ui/Button'
import { useT } from '../i18n'

export function Welcome() {
  const createVault = useStore((s) => s.pickAndCreateVault)
  const openVault = useStore((s) => s.pickAndOpenVault)
  const openPath = useStore((s) => s.openVault)
  const settings = useStore((s) => s.settings)
  const { t } = useT()

  const recents = settings?.recentVaults ?? []

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-8 bg-codex-radial">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src={appConfig.logo}
            alt="Exile Codex"
            className="h-28 w-28 rounded-xl ring-1 ring-bronze-dark/50 glow-rune mb-5"
          />
          <h1 className="font-serif text-4xl text-gradient-bronze font-bold">{appConfig.name}</h1>
          <p className="mt-2 text-ivory-dim">{t('welcome.tagline')}</p>
        </div>

        <div className="codex-panel p-6">
          <h2 className="font-serif text-lg text-gold-pale mb-1">{t('welcome.openCodex')}</h2>
          <p className="text-sm text-ivory-faint mb-5">{t('welcome.intro')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="primary" size="lg" onClick={createVault} className="justify-start">
              <FolderPlus size={18} />
              {t('welcome.create')}
            </Button>
            <Button variant="secondary" size="lg" onClick={openVault} className="justify-start">
              <FolderOpen size={18} />
              {t('welcome.open')}
            </Button>
          </div>

          {recents.length > 0 && (
            <div className="mt-6">
              <div className="text-xs uppercase tracking-wide text-ivory-faint mb-2">{t('welcome.recent')}</div>
              <div className="space-y-1">
                {recents.map((p) => (
                  <button
                    key={p}
                    onClick={() => openPath(p)}
                    className="w-full text-left text-sm text-ivory-dim hover:text-gold-pale rounded px-3 py-2 bg-obsidian-800 border border-stone-border hover:border-bronze-dark transition-colors truncate"
                    title={p}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 text-center">
          <Feature icon={BookOpen} title={t('welcome.feat.organize')} text={t('welcome.feat.organizeText')} />
          <Feature icon={GitBranch} title={t('welcome.feat.version')} text={t('welcome.feat.versionText')} />
          <Feature icon={Shield} title={t('welcome.feat.local')} text={t('welcome.feat.localText')} />
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: typeof BookOpen; title: string; text: string }) {
  return (
    <div className="codex-card p-4">
      <Icon size={20} className="mx-auto text-bronze-light mb-2" />
      <div className="text-sm text-gold-pale font-medium">{title}</div>
      <div className="text-xs text-ivory-faint mt-1">{text}</div>
    </div>
  )
}
