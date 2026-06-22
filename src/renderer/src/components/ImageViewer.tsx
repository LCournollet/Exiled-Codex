import { useEffect, useState } from 'react'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { VaultImage } from './VaultImage'
import { Button } from './ui/Button'
import { useT } from '../i18n'

/** Fullscreen, zoomable viewer for vault images. */
export function ImageViewer({
  relPath,
  caption,
  onClose
}: {
  relPath: string
  caption?: string
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const { t } = useT()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 flex flex-col" onMouseDown={onClose}>
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-stone-border"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="text-sm text-ivory-dim truncate">{caption || relPath.split('/').pop()}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
            <ZoomOut size={18} />
          </Button>
          <span className="text-xs text-ivory-faint w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}>
            <ZoomIn size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom(1)} title={t('image.resetZoom')}>
            <Maximize2 size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <VaultImage
          relPath={relPath}
          alt={caption}
          className="max-w-none transition-transform duration-150 rounded"
        />
      </div>
      <style>{`.flex-1 img { transform: scale(${zoom}); transform-origin: center; }`}</style>
    </div>
  )
}
