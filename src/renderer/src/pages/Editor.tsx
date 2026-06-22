import { useEffect, useRef, useState } from 'react'
import { Save, ArrowLeft, Star, Trash2, ImagePlus, Plus, X, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, unwrap } from '../lib/api'
import type { BuildGuide, ContentImage, ContentItem, ContentType, ExternalLink } from '@shared/types'
import { CONTENT_STATUSES, CONTENT_TYPES } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Input, Field } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Panel, SectionTitle } from '../components/ui/Card'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { VaultImage } from '../components/VaultImage'
import { ConfirmDialog } from '../components/ui/Modal'
import { TYPE_LABEL, STATUS_LABEL, BUDGET_LABEL, confidenceLabel, cn } from '../lib/utils'

const BUILD_SECTIONS: Array<{ key: keyof BuildGuide; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'pros', label: 'Pros' },
  { key: 'cons', label: 'Cons' },
  { key: 'leveling', label: 'Leveling' },
  { key: 'mainSkills', label: 'Main skill gems' },
  { key: 'supportSkills', label: 'Support gems' },
  { key: 'gear', label: 'Recommended gear' },
  { key: 'uniques', label: 'Key uniques' },
  { key: 'priorityStats', label: 'Priority stats' },
  { key: 'defenses', label: 'Defenses' },
  { key: 'damage', label: 'Damage' },
  { key: 'passiveTree', label: 'Passive tree' },
  { key: 'variants', label: 'Variants' },
  { key: 'progressionEarly', label: 'Progression — early' },
  { key: 'progressionMid', label: 'Progression — mid' },
  { key: 'progressionEndgame', label: 'Progression — endgame' },
  { key: 'testNotes', label: 'Test notes' }
]

function emptyItem(type: ContentType, gameVersion: string, league: string): ContentItem {
  const now = new Date().toISOString()
  return {
    id: '',
    title: '',
    type,
    tags: [],
    status: 'draft',
    favorite: false,
    confidence: 2,
    gameVersion,
    league,
    createdAt: now,
    updatedAt: now,
    content: '',
    images: [],
    links: [],
    attachments: [],
    build: type === 'build' ? {} : undefined,
    relPath: ''
  }
}

export function Editor() {
  const route = useStore((s) => s.route)
  const navigate = useStore((s) => s.navigate)
  const settings = useStore((s) => s.settings)
  const saveItem = useStore((s) => s.saveItem)
  const deleteItem = useStore((s) => s.deleteItem)
  const toast = useStore((s) => s.toast)

  const isNew = route.relPath === 'new'
  const [draft, setDraft] = useState<ContentItem | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)

  // Load or create the draft.
  useEffect(() => {
    let active = true
    if (isNew) {
      setDraft(
        emptyItem(
          route.newType ?? 'guide',
          settings?.defaultGameVersion ?? '',
          settings?.defaultLeague ?? ''
        )
      )
    } else if (route.relPath) {
      api.content.get(route.relPath).then((r) => {
        if (active && r.ok && r.data) setDraft(r.data)
      })
    }
    return () => {
      active = false
    }
  }, [route.relPath, route.newType, isNew, settings])

  const patch = (p: Partial<ContentItem>) => {
    setDraft((d) => (d ? { ...d, ...p } : d))
    dirty.current = true
  }
  const patchBuild = (p: Partial<BuildGuide>) => {
    setDraft((d) => (d ? { ...d, build: { ...(d.build ?? {}), ...p } } : d))
    dirty.current = true
  }

  // Auto-save for already-persisted entries.
  useEffect(() => {
    if (!draft || !settings?.autoSave || !draft.relPath || !dirty.current) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const saved = await saveItem(draft)
      dirty.current = false
      setDraft((d) => (d ? { ...d, updatedAt: saved.updatedAt, relPath: saved.relPath } : d))
      setSavedAt(new Date().toLocaleTimeString())
    }, settings.autoSaveDelayMs)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [draft, settings, saveItem])

  if (!draft) {
    return <div className="p-6 text-ivory-faint">Loading…</div>
  }

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast('error', 'Give your entry a title first.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveItem(draft)
      dirty.current = false
      setDraft(saved)
      setSavedAt(new Date().toLocaleTimeString())
      toast('success', 'Saved.')
      if (isNew) navigate('editor', { relPath: saved.relPath })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !draft.tags.includes(t)) patch({ tags: [...draft.tags, t] })
    setTagInput('')
  }

  const addImages = async () => {
    try {
      const paths = await unwrap(api.images.pickAndAdd('images'))
      if (!paths.length) return
      const imgs: ContentImage[] = paths.map((p) => ({ path: p, category: 'screenshot' }))
      patch({ images: [...draft.images, ...imgs] })
      toast('success', `${paths.length} image(s) added to the gallery.`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    }
  }

  const insertImageRef = async () => {
    const paths = await unwrap(api.images.pickAndAdd('images')).catch(() => [] as string[])
    if (!paths.length) return
    const md = paths.map((p) => `\n![](${p})\n`).join('')
    patch({
      content: draft.content + md,
      images: [...draft.images, ...paths.map((p) => ({ path: p }))]
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto pb-20">
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate(isNew ? 'library' : 'detail', { relPath: draft.relPath })}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-xl text-gold-pale">{isNew ? 'New entry' : 'Edit entry'}</h1>
          {savedAt && <span className="text-xs text-ivory-faint">Saved at {savedAt}</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => patch({ favorite: !draft.favorite })}
          className={cn(draft.favorite && 'text-ember')}
          title="Favorite"
        >
          <Star size={18} fill={draft.favorite ? 'currentColor' : 'none'} />
        </Button>
        {!isNew && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> Delete
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <Input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Entry title…"
            className="text-lg font-serif"
          />

          <MarkdownEditor
            value={draft.content}
            onChange={(v) => patch({ content: v })}
            onInsertImage={insertImageRef}
          />

          {/* Build sections */}
          {draft.type === 'build' && (
            <Panel>
              <SectionTitle>Build sheet</SectionTitle>
              <div className="mb-4">
                <Field label="Budget">
                  <Select
                    value={draft.build?.budget ?? ''}
                    onChange={(e) => patchBuild({ budget: (e.target.value || undefined) as BuildGuide['budget'] })}
                  >
                    <option value="">Unspecified</option>
                    {(['low', 'medium', 'high'] as const).map((b) => (
                      <option key={b} value={b}>
                        {BUILD_LABEL(b)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {draft.build?.imported && (
                <div className="mb-4 rounded-md border border-bronze-dark/40 bg-bronze/5 p-3 text-xs text-ivory-dim">
                  <span className="text-gold-pale font-medium">Imported data attached:</span>{' '}
                  {draft.build.imported.passives?.length ?? 0} passives,{' '}
                  {draft.build.imported.skills?.length ?? 0} skill setups (preserved in the file).
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BUILD_SECTIONS.map((s) => (
                  <Field key={s.key} label={s.label}>
                    <textarea
                      value={(draft.build?.[s.key] as string) ?? ''}
                      onChange={(e) => patchBuild({ [s.key]: e.target.value })}
                      rows={3}
                      className="w-full bg-obsidian-800 border border-stone-border rounded-md px-3 py-2 text-sm text-ivory placeholder:text-ivory-faint focus:outline-none focus:border-bronze-dark focus:ring-1 focus:ring-bronze/40 resize-y font-mono"
                      placeholder="Markdown supported…"
                    />
                  </Field>
                ))}
              </div>
            </Panel>
          )}

          {/* Gallery */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle className="mb-0">Image gallery</SectionTitle>
              <Button variant="secondary" size="sm" onClick={addImages}>
                <ImagePlus size={15} /> Add images
              </Button>
            </div>
            {draft.images.length === 0 ? (
              <p className="text-xs text-ivory-faint">No images yet. Add skill-tree captures, gear or diagrams.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {draft.images.map((img, idx) => (
                  <div key={img.path} className="space-y-1.5">
                    <div className="relative group">
                      <VaultImage relPath={img.path} className="w-full h-28 object-cover rounded-md border border-stone-border" />
                      <button
                        onClick={() =>
                          patch({ images: draft.images.filter((_, i) => i !== idx) })
                        }
                        className="absolute top-1 right-1 bg-black/70 rounded p-1 text-ivory-dim hover:text-crimson-bright opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from gallery"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <Input
                      value={img.caption ?? ''}
                      onChange={(e) => {
                        const next = [...draft.images]
                        next[idx] = { ...next[idx], caption: e.target.value }
                        patch({ images: next })
                      }}
                      placeholder="Caption…"
                      className="text-xs py-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Private notes */}
          <Field label="Private notes (never exported)">
            <textarea
              value={draft.privateNotes ?? ''}
              onChange={(e) => patch({ privateNotes: e.target.value })}
              rows={3}
              className="w-full bg-obsidian-800 border border-stone-border rounded-md px-3 py-2 text-sm text-ivory-dim focus:outline-none focus:border-bronze-dark resize-y"
              placeholder="Reminders for yourself…"
            />
          </Field>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Panel className="space-y-4">
            <Field label="Type">
              <Select value={draft.type} onChange={(e) => patch({ type: e.target.value as ContentType, build: e.target.value === 'build' ? draft.build ?? {} : draft.build })}>
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={draft.status} onChange={(e) => patch({ status: e.target.value as ContentItem['status'] })}>
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class">
                <Input value={draft.className ?? ''} onChange={(e) => patch({ className: e.target.value })} placeholder="e.g. Sorceress" />
              </Field>
              <Field label="Ascendancy">
                <Input value={draft.ascendancy ?? ''} onChange={(e) => patch({ ascendancy: e.target.value })} placeholder="e.g. Stormweaver" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Patch / version">
                <Input value={draft.gameVersion ?? ''} onChange={(e) => patch({ gameVersion: e.target.value })} placeholder="e.g. 0.3" />
              </Field>
              <Field label="League / season">
                <Input value={draft.league ?? ''} onChange={(e) => patch({ league: e.target.value })} placeholder="e.g. Standard" />
              </Field>
            </div>
            <Field label={`Confidence — ${confidenceLabel(draft.confidence)}`}>
              <input
                type="range"
                min={1}
                max={5}
                value={draft.confidence ?? 2}
                onChange={(e) => patch({ confidence: Number(e.target.value) as ContentItem['confidence'] })}
                className="w-full accent-ember"
              />
            </Field>
          </Panel>

          {/* Tags */}
          <Panel>
            <SectionTitle>Tags</SectionTitle>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag…"
              />
              <Button variant="secondary" size="icon" onClick={addTag}>
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {draft.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full border border-stone-border bg-obsidian-800 px-2 py-0.5 text-xs text-ivory-dim">
                  #{t}
                  <button onClick={() => patch({ tags: draft.tags.filter((x) => x !== t) })} className="hover:text-crimson-bright">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </Panel>

          {/* External links */}
          <Panel>
            <SectionTitle>External links</SectionTitle>
            <LinksEditor links={draft.links} onChange={(links) => patch({ links })} />
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        message="It will be moved to the vault trash folder (metadata/.trash) and removed from your library. You can recover it from disk."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          await deleteItem(draft.relPath)
          navigate('library')
        }}
      />
    </div>
  )
}

function LinksEditor({ links, onChange }: { links: ExternalLink[]; onChange: (l: ExternalLink[]) => void }) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const add = () => {
    if (!url.trim()) return
    onChange([...links, { label: label.trim() || url.trim(), url: url.trim() }])
    setLabel('')
    setUrl('')
  }
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="flex-1 truncate text-bronze-light">{l.label}</span>
          <button onClick={() => onChange(links.filter((_, idx) => idx !== i))} className="text-ivory-faint hover:text-crimson-bright">
            <X size={14} />
          </button>
        </div>
      ))}
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="text-xs py-1" />
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="text-xs py-1" />
        <Button variant="secondary" size="icon" onClick={add}>
          <Check size={15} />
        </Button>
      </div>
    </div>
  )
}

function BUILD_LABEL(b: 'low' | 'medium' | 'high'): string {
  return BUDGET_LABEL[b]
}
