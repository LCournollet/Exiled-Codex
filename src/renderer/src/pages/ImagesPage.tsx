import { useEffect, useState } from 'react'
import { ImagePlus, Trash2, FolderTree } from 'lucide-react'
import { api, unwrap } from '../lib/api'
import { useStore } from '../store/useStore'
import { Button } from '../components/ui/Button'
import { VaultImage } from '../components/VaultImage'
import { ImageViewer } from '../components/ImageViewer'
import { ConfirmDialog } from '../components/ui/Modal'
import { cn } from '../lib/utils'

type Cat = 'all' | 'images' | 'trees' | 'icons'

const CAT_LABEL: Record<Exclude<Cat, 'all'>, string> = {
  images: 'Screenshots & diagrams',
  trees: 'Skill trees',
  icons: 'Icons'
}

export function ImagesPage({
  defaultCategory = 'all',
  heading = 'Images',
  subtitle = 'Every image stored in your vault.'
}: {
  defaultCategory?: Cat
  heading?: string
  subtitle?: string
}) {
  const toast = useStore((s) => s.toast)
  const [images, setImages] = useState<Array<{ path: string; category: string }>>([])
  const [cat, setCat] = useState<Cat>(defaultCategory)
  const [viewer, setViewer] = useState<{ path: string } | null>(null)
  const [toDelete, setToDelete] = useState<string | null>(null)

  const load = () => api.images.list().then((r) => r.ok && setImages(r.data ?? []))
  useEffect(() => {
    load()
  }, [])

  const addTo = async (category: 'images' | 'trees' | 'icons') => {
    try {
      const added = await unwrap(api.images.pickAndAdd(category))
      if (added.length) {
        await load()
        toast('success', `${added.length} image(s) added.`)
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const filtered = cat === 'all' ? images : images.filter((i) => i.category === cat)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="font-serif text-2xl text-gradient-bronze font-semibold">{heading}</h1>
          <p className="text-sm text-ivory-faint mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => addTo('trees')}>
            <FolderTree size={15} /> Add tree
          </Button>
          <Button variant="primary" size="sm" onClick={() => addTo(cat === 'all' ? 'images' : (cat as 'images'))}>
            <ImagePlus size={15} /> Add images
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {(['all', 'images', 'trees', 'icons'] as Cat[]).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm border transition-colors',
              cat === c
                ? 'bg-stone-raised text-gold-pale border-bronze-dark/50'
                : 'text-ivory-dim border-stone-border hover:text-ivory'
            )}
          >
            {c === 'all' ? 'All' : CAT_LABEL[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="codex-card p-10 text-center text-ivory-faint">
          No images here yet. Add captures, gear shots or skill trees.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((img) => (
            <div key={img.path} className="group relative">
              <VaultImage
                relPath={img.path}
                onClick={() => setViewer({ path: img.path })}
                className="w-full h-36 object-cover rounded-md border border-stone-border hover:border-bronze-dark"
              />
              <button
                onClick={() => setToDelete(img.path)}
                className="absolute top-1 right-1 bg-black/70 rounded p-1 text-ivory-dim hover:text-crimson-bright opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete image"
              >
                <Trash2 size={14} />
              </button>
              <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 rounded px-1.5 py-0.5 text-ivory-faint">
                {img.category}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewer && <ImageViewer relPath={viewer.path} onClose={() => setViewer(null)} />}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this image?"
        message="It will be moved to the vault trash folder. Entries referencing it will show a missing-image placeholder."
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) {
            await api.images.remove(toDelete)
            await load()
            toast('success', 'Image moved to trash.')
          }
          setToDelete(null)
        }}
      />
    </div>
  )
}
