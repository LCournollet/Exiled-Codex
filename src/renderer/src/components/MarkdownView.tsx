import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Callout, CalloutKind } from './Callout'
import { VaultImage } from './VaultImage'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

type Block =
  | { kind: 'md'; text: string }
  | { kind: 'callout'; calloutKind: CalloutKind; title?: string; body: string }

const CALLOUT_KINDS: CalloutKind[] = ['note', 'important', 'tip', 'warning', 'danger']

/**
 * Split markdown into plain segments and GitHub-style callout blockquotes
 * (`> [!tip] Title` followed by `>`-prefixed body lines).
 */
function parseBlocks(src: string): Block[] {
  const lines = src.split(/\r?\n/)
  const blocks: Block[] = []
  let buffer: string[] = []

  const flush = () => {
    if (buffer.length) {
      blocks.push({ kind: 'md', text: buffer.join('\n') })
      buffer = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^>\s*\[!(\w+)\]\s*(.*)$/i)
    if (m && CALLOUT_KINDS.includes(m[1].toLowerCase() as CalloutKind)) {
      flush()
      const calloutKind = m[1].toLowerCase() as CalloutKind
      const title = m[2].trim() || undefined
      const body: string[] = []
      let j = i + 1
      while (j < lines.length && /^>/.test(lines[j])) {
        body.push(lines[j].replace(/^>\s?/, ''))
        j++
      }
      blocks.push({ kind: 'callout', calloutKind, title, body: body.join('\n') })
      i = j - 1
    } else {
      buffer.push(lines[i])
    }
  }
  flush()
  return blocks
}

function Md({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault()
              if (href) window.api.openExternal(href)
            }}
          >
            {children}
          </a>
        ),
        img: ({ src, alt }) => {
          const url = String(src ?? '')
          // External / data images render natively; vault-relative paths go through the bridge.
          if (/^(https?:|data:)/.test(url)) {
            return <img src={url} alt={alt ?? ''} className="rounded-lg border border-stone-border" />
          }
          return (
            <VaultImage relPath={url} alt={alt} className="rounded-lg border border-stone-border max-h-96" />
          )
        }
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

export function MarkdownView({ source, className }: { source: string; className?: string }) {
  const { t } = useT()
  const blocks = useMemo(() => parseBlocks(source || ''), [source])
  if (!source?.trim()) {
    return <p className="text-ivory-faint italic text-sm">{t('md.nothing')}</p>
  }
  return (
    <div className={cn('prose-codex', className)}>
      {blocks.map((b, i) =>
        b.kind === 'md' ? (
          <Md key={i}>{b.text}</Md>
        ) : (
          <Callout key={i} kind={b.calloutKind} title={b.title}>
            <Md>{b.body}</Md>
          </Callout>
        )
      )}
    </div>
  )
}
