import { useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Heading,
  List,
  ListChecks,
  Quote,
  Code,
  Table,
  Link2,
  Image as ImageIcon,
  Eye,
  Pencil,
  Columns
} from 'lucide-react'
import { MarkdownView } from './MarkdownView'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

type Mode = 'write' | 'split' | 'preview'

interface Props {
  value: string
  onChange: (v: string) => void
  onInsertImage?: () => void
  minHeight?: number
}

interface ToolAction {
  icon: typeof Bold
  label: string
  tkey: string
  run: (sel: { before: string; selected: string; after: string }) => { text: string; cursor?: number }
}

const wrap = (token: string) => (s: { before: string; selected: string; after: string }) => ({
  text: `${s.before}${token}${s.selected || 'text'}${token}${s.after}`
})

const prefixLines = (prefix: string) => (s: { before: string; selected: string; after: string }) => {
  const block = (s.selected || 'item')
    .split('\n')
    .map((l) => `${prefix}${l}`)
    .join('\n')
  return { text: `${s.before}${block}${s.after}` }
}

const TOOLS: ToolAction[] = [
  { icon: Bold, label: 'Bold', tkey: 'md.bold', run: wrap('**') },
  { icon: Italic, label: 'Italic', tkey: 'md.italic', run: wrap('_') },
  {
    icon: Heading,
    label: 'Heading',
    tkey: 'md.heading',
    run: (s) => ({ text: `${s.before}## ${s.selected || 'Heading'}${s.after}` })
  },
  { icon: List, label: 'Bullet list', tkey: 'md.bullet', run: prefixLines('- ') },
  { icon: ListChecks, label: 'Checklist', tkey: 'md.checklist', run: prefixLines('- [ ] ') },
  { icon: Quote, label: 'Quote', tkey: 'md.quote', run: prefixLines('> ') },
  {
    icon: Code,
    label: 'Code block',
    tkey: 'md.code',
    run: (s) => ({ text: `${s.before}\n\`\`\`\n${s.selected || 'code'}\n\`\`\`\n${s.after}` })
  },
  {
    icon: Table,
    label: 'Table',
    tkey: 'md.table',
    run: (s) => ({
      text: `${s.before}\n| Column | Column |\n| --- | --- |\n| Cell | Cell |\n${s.after}`
    })
  },
  {
    icon: Link2,
    label: 'Link',
    tkey: 'md.link',
    run: (s) => ({ text: `${s.before}[${s.selected || 'label'}](https://)${s.after}` })
  }
]

const CALLOUT_SNIPPETS: Array<{ kind: 'important' | 'tip' | 'warning' | 'danger'; tone: string }> = [
  { kind: 'important', tone: 'text-gold-pale' },
  { kind: 'tip', tone: 'text-emerald-300' },
  { kind: 'warning', tone: 'text-ember-glow' },
  { kind: 'danger', tone: 'text-crimson-bright' }
]

export function MarkdownEditor({ value, onChange, onInsertImage, minHeight = 360 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<Mode>('split')
  const { t } = useT()

  const apply = (action: ToolAction['run']) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = value.slice(0, start)
    const selected = value.slice(start, end)
    const after = value.slice(end)
    const { text } = action({ before, selected, after })
    onChange(text)
    requestAnimationFrame(() => el.focus())
  }

  const insertSnippet = (snippet: string) => {
    const el = ref.current
    const pos = el ? el.selectionStart : value.length
    onChange(value.slice(0, pos) + snippet + value.slice(pos))
  }

  return (
    <div className="codex-panel p-0 overflow-hidden flex flex-col" style={{ minHeight }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-border px-2 py-1.5 bg-obsidian-800/60">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            title={t(tool.tkey)}
            onClick={() => apply(tool.run)}
            className="h-8 w-8 inline-flex items-center justify-center rounded text-ivory-dim hover:bg-stone-raised hover:text-gold-pale transition-colors"
          >
            <tool.icon size={16} />
          </button>
        ))}
        {onInsertImage && (
          <button
            title={t('md.image')}
            onClick={onInsertImage}
            className="h-8 w-8 inline-flex items-center justify-center rounded text-ivory-dim hover:bg-stone-raised hover:text-gold-pale transition-colors"
          >
            <ImageIcon size={16} />
          </button>
        )}
        <span className="mx-1 h-5 w-px bg-stone-border" />
        {CALLOUT_SNIPPETS.map((c) => {
          const label = t(`callout.${c.kind}`)
          return (
            <button
              key={c.kind}
              title={t('md.insertCallout', { kind: label })}
              onClick={() => insertSnippet(`\n> [!${c.kind}] ${label}\n> ...\n`)}
              className={cn(
                'h-8 px-2 inline-flex items-center rounded text-[11px] font-medium hover:bg-stone-raised transition-colors',
                c.tone
              )}
            >
              {label}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-1">
          <ModeButton active={mode === 'write'} onClick={() => setMode('write')} icon={Pencil} label={t('md.write')} />
          <ModeButton active={mode === 'split'} onClick={() => setMode('split')} icon={Columns} label={t('md.split')} />
          <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} icon={Eye} label={t('md.preview')} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {mode !== 'preview' && (
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder={t('editor.mdPlaceholder')}
            className={cn(
              'flex-1 bg-obsidian-900 text-ivory-dim font-mono text-sm leading-relaxed p-4 resize-none focus:outline-none',
              mode === 'split' && 'border-r border-stone-border'
            )}
          />
        )}
        {mode !== 'write' && (
          <div className="flex-1 overflow-y-auto p-4 bg-stone-panel">
            <MarkdownView source={value} />
          </div>
        )}
      </div>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: typeof Eye
  label: string
}) {
  return (
    <Button variant={active ? 'secondary' : 'ghost'} size="sm" onClick={onClick} className="gap-1.5">
      <Icon size={14} />
      {label}
    </Button>
  )
}
