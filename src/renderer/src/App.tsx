import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Toasts } from './components/ui/Toasts'
import { Welcome } from './pages/Welcome'
import { Dashboard } from './pages/Dashboard'
import { Library } from './pages/Library'
import { TypedLibrary } from './pages/TypedLibrary'
import { Trees } from './pages/Trees'
import { ImagesPage } from './pages/ImagesPage'
import { TagsPage } from './pages/TagsPage'
import { GitHubPage } from './pages/GitHubPage'
import { SettingsPage } from './pages/SettingsPage'
import { Editor } from './pages/Editor'
import { ContentDetail } from './pages/ContentDetail'
import { appConfig } from './config/app.config'

function CurrentPage() {
  const page = useStore((s) => s.route.page)
  switch (page) {
    case 'dashboard':
      return <Dashboard />
    case 'library':
      return <Library />
    case 'builds':
      return <TypedLibrary type="build" />
    case 'starters':
      return <TypedLibrary type="starter" />
    case 'guides':
      return <TypedLibrary type="guide" />
    case 'trees':
      return <Trees />
    case 'images':
      return <ImagesPage />
    case 'tags':
      return <TagsPage />
    case 'github':
      return <GitHubPage />
    case 'settings':
      return <SettingsPage />
    case 'editor':
      return <Editor />
    case 'detail':
      return <ContentDetail />
    default:
      return <Dashboard />
  }
}

export default function App() {
  const ready = useStore((s) => s.ready)
  const vaultPath = useStore((s) => s.vaultPath)
  const init = useStore((s) => s.init)
  const navigate = useStore((s) => s.navigate)

  useEffect(() => {
    init()
  }, [init])

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!vaultPath) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('header input')
        input?.focus()
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigate('editor', { relPath: 'new' })
      }
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        navigate('github')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [vaultPath, navigate])

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center">
        <img src={appConfig.logo} alt="" className="h-20 w-20 rounded-lg opacity-60 animate-pulse" />
      </div>
    )
  }

  if (!vaultPath) {
    return (
      <>
        <Welcome />
        <Toasts />
      </>
    )
  }

  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-codex-radial">
          <CurrentPage />
        </main>
      </div>
      <Toasts />
    </div>
  )
}
