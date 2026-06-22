import {
  LayoutDashboard,
  Library,
  Swords,
  Rocket,
  ScrollText,
  Network,
  Images,
  Tags,
  Github,
  Settings,
  Plus
} from 'lucide-react'
import { useStore, PageId } from '../../store/useStore'
import { appConfig } from '../../config/app.config'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface NavItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'builds', label: 'Builds', icon: Swords },
  { id: 'starters', label: 'Starters', icon: Rocket },
  { id: 'guides', label: 'Guides', icon: ScrollText },
  { id: 'trees', label: 'Skill Trees', icon: Network },
  { id: 'images', label: 'Images', icon: Images },
  { id: 'tags', label: 'Tags', icon: Tags },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  const route = useStore((s) => s.route)
  const navigate = useStore((s) => s.navigate)
  const gitStatus = useStore((s) => s.gitStatus)

  const dirtyCount = gitStatus?.files.length ?? 0

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-stone-border bg-obsidian-900/80">
      {/* Logo + name */}
      <button
        onClick={() => navigate('dashboard')}
        className="flex items-center gap-3 px-4 py-4 border-b border-stone-border hover:bg-obsidian-800/50 transition-colors"
      >
        <img
          src={appConfig.logo}
          alt=""
          className="h-11 w-11 rounded-md object-cover ring-1 ring-bronze-dark/50 glow-rune"
        />
        <div className="text-left leading-tight">
          <div className="font-serif text-base text-gradient-bronze font-semibold">{appConfig.name}</div>
          <div className="text-[10px] uppercase tracking-widest text-ivory-faint">Codex</div>
        </div>
      </button>

      <div className="p-3">
        <Button variant="primary" className="w-full" onClick={() => navigate('editor', { relPath: 'new' })}>
          <Plus size={16} />
          New entry
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {NAV.map((item) => {
          const active =
            route.page === item.id ||
            (item.id === 'library' && ['detail', 'editor'].includes(route.page))
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-stone-raised text-gold-pale border border-bronze-dark/40'
                  : 'text-ivory-dim hover:bg-stone-panel hover:text-ivory border border-transparent'
              )}
            >
              <Icon size={17} className={cn(active && 'text-bronze-light')} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'github' && dirtyCount > 0 && (
                <span className="text-[10px] rounded-full bg-ember/20 text-ember-glow px-1.5 py-0.5 border border-ember/40">
                  {dirtyCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-stone-border text-[10px] text-ivory-faint">
        v{appConfig.version} · local-first
      </div>
    </aside>
  )
}
