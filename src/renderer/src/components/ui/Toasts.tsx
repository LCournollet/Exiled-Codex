import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { cn } from '../../lib/utils'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info
}

const TONE = {
  success: 'border-emerald-700/50 text-emerald-200',
  error: 'border-crimson/60 text-crimson-bright',
  info: 'border-bronze-dark text-gold-pale'
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={cn(
              'codex-panel flex items-start gap-3 p-3 pr-2 shadow-panel animate-in',
              TONE[t.kind]
            )}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm text-ivory-dim flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ivory-faint hover:text-ivory shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
