import type { GitStatus, GitFileChange } from '@shared/types'
import { Badge } from './ui/Badge'
import { cn } from '../lib/utils'
import { useT } from '../i18n'
import { FileEdit, FilePlus, FileMinus, FileQuestion, AlertOctagon } from 'lucide-react'

const STATE_META: Record<GitFileChange['state'], { icon: typeof FileEdit; cls: string; label: string }> = {
  modified: { icon: FileEdit, cls: 'text-ember-glow', label: 'M' },
  added: { icon: FilePlus, cls: 'text-emerald-300', label: 'A' },
  deleted: { icon: FileMinus, cls: 'text-crimson-bright', label: 'D' },
  renamed: { icon: FileEdit, cls: 'text-bronze-light', label: 'R' },
  untracked: { icon: FileQuestion, cls: 'text-ivory-faint', label: '?' },
  conflicted: { icon: AlertOctagon, cls: 'text-crimson-bright', label: '!' }
}

export function GitStatusPanel({ status }: { status: GitStatus }) {
  const { t } = useT()
  if (status.clean) {
    return (
      <div className="text-sm text-ivory-faint flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400" /> {t('git.clean')}
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
      {status.files.map((f) => {
        const meta = STATE_META[f.state]
        const Icon = meta.icon
        return (
          <div key={f.path} className="flex items-center gap-2 text-sm py-1">
            <Icon size={14} className={cn('shrink-0', meta.cls)} />
            <span className="font-mono text-xs text-ivory-dim truncate flex-1" title={f.path}>
              {f.path}
            </span>
            <Badge tone={f.state === 'conflicted' ? 'crimson' : 'neutral'}>{f.state}</Badge>
          </div>
        )
      })}
    </div>
  )
}
