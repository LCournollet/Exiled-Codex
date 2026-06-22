import { useEffect, useState } from 'react'
import { Network, Images as ImagesIcon } from 'lucide-react'
import { ImagesPage } from './ImagesPage'
import { FullSkillTree } from '../components/FullSkillTree'
import { useStore } from '../store/useStore'
import { api } from '../lib/api'
import { Select } from '../components/ui/Select'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

type Tab = 'tree' | 'images'

export function Trees() {
  const items = useStore((s) => s.items)
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('tree')
  const builds = items.filter((i) => i.type === 'build')

  const [selected, setSelected] = useState<string>('')
  const [allocated, setAllocated] = useState<string[] | undefined>(undefined)

  useEffect(() => {
    let active = true
    if (!selected) {
      setAllocated(undefined)
      return
    }
    api.content.get(selected).then((r) => {
      if (!active) return
      const passives = r.ok ? r.data?.build?.imported?.passives : undefined
      setAllocated(passives ? passives.map((p) => p.id) : [])
    })
    return () => {
      active = false
    }
  }, [selected])

  if (tab === 'images') {
    return (
      <div>
        <Tabs tab={tab} setTab={setTab} />
        <ImagesPage
          defaultCategory="trees"
          heading={t('trees.capturesHeading')}
          subtitle={t('trees.capturesSub')}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Tabs tab={tab} setTab={setTab} />
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">{t('trees.heading')}</h1>
          <p className="text-sm text-ivory-faint mt-1">{t('trees.sub')}</p>
        </div>
        <div className="w-64">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{t('trees.noOverlay')}</option>
            {builds.map((b) => (
              <option key={b.relPath} value={b.relPath}>
                {b.title}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <FullSkillTree allocatedIds={allocated} />
      <p className="text-[11px] text-ivory-faint mt-2">{t('trees.hint')}</p>
    </div>
  )
}

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useT()
  return (
    <div className="flex gap-2 px-6 pt-6 max-w-7xl mx-auto">
      <TabButton active={tab === 'tree'} onClick={() => setTab('tree')} icon={Network} label={t('trees.fullTab')} />
      <TabButton active={tab === 'images'} onClick={() => setTab('images')} icon={ImagesIcon} label={t('trees.capturesTab')} />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: typeof Network
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors',
        active
          ? 'bg-stone-raised text-gold-pale border-bronze-dark/50'
          : 'text-ivory-dim border-stone-border hover:text-ivory'
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
