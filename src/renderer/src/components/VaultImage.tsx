import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

const cache = new Map<string, string>()

/**
 * Renders an image stored inside the vault by resolving it to a data URL through
 * the main process (the renderer is sandboxed and cannot read files directly).
 */
export function VaultImage({
  relPath,
  alt,
  className,
  onClick
}: {
  relPath: string
  alt?: string
  className?: string
  onClick?: () => void
}) {
  const { t } = useT()
  const [src, setSrc] = useState<string | null>(cache.get(relPath) ?? null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    if (cache.has(relPath)) {
      setSrc(cache.get(relPath)!)
      return
    }
    api.images
      .dataUrl(relPath)
      .then((res) => {
        if (!active) return
        if (res.ok && res.data) {
          cache.set(relPath, res.data)
          setSrc(res.data)
        } else {
          setFailed(true)
        }
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [relPath])

  if (failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 bg-obsidian-800 text-ivory-faint text-xs',
          className
        )}
      >
        <ImageOff size={20} />
        <span>{t('image.missing')}</span>
      </div>
    )
  }

  if (!src) {
    return <div className={cn('animate-pulse bg-obsidian-800', className)} />
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      onClick={onClick}
      className={cn(onClick && 'cursor-zoom-in', className)}
    />
  )
}
