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
import { confidenceLabel, cn } from '../lib/utils'
import { useT } from '../i18n'

const BUILD_SECTIONS: Array<keyof BuildGuide> = [
  'summary',
  'pros',
  'cons',
  'leveling',
  'mainSkills',
  'supportSkills',
  'gear',
  'uniques',
  'priorityStats',
  'defenses',
  'damage',
  'passiveTree',
  'variants',
  'progressionEarly',
  'progressionMid',
  'progressionEndgame',
  'testNotes'
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
  const { t, lang } = useT()

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
    return <div className="p-6 text-ivory-faint">{t('common.loading')}</div>
  }

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast('error', t('editor.needTitle'))
      return
    }
    setSaving(true)
    try {
      const saved = await saveItem(draft)
      dirty.current = false
      setDraft(saved)
      setSavedAt(new Date().toLocaleTimeString())
      toast('success', t('common.saved'))
      if (isNew) navigate('editor', { relPath: saved.relPath })
    } catch (err) {
      toast('error', err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !draft.tags.includes(tag)) patch({ tags: [...draft.tags, tag] })
    setTagInput('')
  }

  const addImages = async () => {
    try {
      const paths = await unwrap(api.images.pickAndAdd('images'))
      if (!paths.length) return
      const imgs: ContentImage[] = paths.map((p) => ({ path: p, category: 'screenshot' }))
      patch({ images: [...draft.images, ...imgs] })
      toast('success', t('editor.imagesAdded', { n: paths.length }))
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
          <h1 className="font-serif text-xl text-gold-pale">{isNew ? t('editor.new') : t('editor.edit')}</h1>
          {savedAt && <span className="text-xs text-ivory-faint">{t('editor.savedAt', { time: savedAt })}</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => patch({ favorite: !draft.favorite })}
          className={cn(draft.favorite && 'text-ember')}
          title={t('editor.favorite')}
        >
          <Star size={18} fill={draft.favorite ? 'currentColor' : 'none'} />
        </Button>
        {!isNew && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> {t('common.delete')}
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <Input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t('editor.titlePlaceholder')}
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
              <SectionTitle>{t('editor.buildSheet')}</SectionTitle>
              <div className="mb-4">
                <Field label={t('editor.budget')}>
                  <Select
                    value={draft.build?.budget ?? ''}
                    onChange={(e) => patchBuild({ budget: (e.target.value || undefined) as BuildGuide['budget'] })}
                  >
                    <option value="">{t('common.unspecified')}</option>
                    {(['low', 'medium', 'high'] as const).map((b) => (
                      <option key={b} value={b}>
                        {t(`budget.${b}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {draft.build?.imported && (
                <div className="mb-4 rounded-md border border-bronze-dark/40 bg-bronze/5 p-3 text-xs text-ivory-dim">
                  {t('editor.importedAttached', {
                    passives: draft.build.imported.passives?.length ?? 0,
                    skills: draft.build.imported.skills?.length ?? 0
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BUILD_SECTIONS.map((key) => (
                  <Field key={key} label={t(`build.${key}`)}>
                    <textarea
                      value={(draft.build?.[key] as string) ?? ''}
                      onChange={(e) => patchBuild({ [key]: e.target.value })}
                      rows={3}
                      className="w-full bg-obsidian-800 border border-stone-border rounded-md px-3 py-2 text-sm text-ivory placeholder:text-ivory-faint focus:outline-none focus:border-bronze-dark focus:ring-1 focus:ring-bronze/40 resize-y font-mono"
                      placeholder={t('editor.mdSupported')}
                    />
                  </Field>
                ))}
              </div>
            </Panel>
          )}

          {/* Gallery */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle className="mb-0">{t('editor.gallery')}</SectionTitle>
              <Button variant="secondary" size="sm" onClick={addImages}>
                <ImagePlus size={15} /> {t('editor.addImages')}
              </Button>
            </div>
            {draft.images.length === 0 ? (
              <p className="text-xs text-ivory-faint">{t('editor.galleryEmpty')}</p>
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
                        title={t('editor.removeFromGallery')}
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
                      placeholder={t('editor.caption')}
                      className="text-xs py-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Private notes */}
          <Field label={t('editor.privateNotes')}>
            <textarea
              value={draft.privateNotes ?? ''}
              onChange={(e) => patch({ privateNotes: e.target.value })}
              rows={3}
              className="w-full bg-obsidian-800 border border-stone-border rounded-md px-3 py-2 text-sm text-ivory-dim focus:outline-none focus:border-bronze-dark resize-y"
              placeholder={t('editor.privateNotesPlaceholder')}
            />
          </Field>
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Panel className="space-y-4">
            <Field label={t('editor.type')}>
              <Select value={draft.type} onChange={(e) => patch({ type: e.target.value as ContentType, build: e.target.value === 'build' ? draft.build ?? {} : draft.build })}>
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {t(`type.${ct}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('editor.status')}>
              <Select value={draft.status} onChange={(e) => patch({ status: e.target.value as ContentItem['status'] })}>
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('editor.class')}>
                <Input value={draft.className ?? ''} onChange={(e) => patch({ className: e.target.value })} placeholder={t('editor.classPlaceholder')} />
              </Field>
              <Field label={t('editor.ascendancy')}>
                <Input value={draft.ascendancy ?? ''} onChange={(e) => patch({ ascendancy: e.target.value })} placeholder={t('editor.ascendancyPlaceholder')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('editor.patch')}>
                <Input value={draft.gameVersion ?? ''} onChange={(e) => patch({ gameVersion: e.target.value })} placeholder="0.3" />
              </Field>
              <Field label={t('editor.league')}>
                <Input value={draft.league ?? ''} onChange={(e) => patch({ league: e.target.value })} placeholder="Standard" />
              </Field>
            </div>
            <Field label={t('editor.confidence', { label: confidenceLabel(lang, draft.confidence) })}>
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
            <SectionTitle>{t('editor.tags')}</SectionTitle>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder={t('editor.addTag')}
              />
              <Button variant="secondary" size="icon" onClick={addTag}>
                <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {draft.tags.map((tg) => (
                <span key={tg} className="inline-flex items-center gap-1 rounded-full border border-stone-border bg-obsidian-800 px-2 py-0.5 text-xs text-ivory-dim">
                  #{tg}
                  <button onClick={() => patch({ tags: draft.tags.filter((x) => x !== tg) })} className="hover:text-crimson-bright">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </Panel>

          {/* External links */}
          <Panel>
            <SectionTitle>{t('editor.externalLinks')}</SectionTitle>
            <LinksEditor links={draft.links} onChange={(links) => patch({ links })} />
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('editor.deleteTitle')}
        message={t('editor.deleteMsg')}
        confirmLabel={t('common.delete')}
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
  const { t } = useT()
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
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('editor.linkLabel')} className="text-xs py-1" />
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="text-xs py-1" />
        <Button variant="secondary" size="icon" onClick={add}>
          <Check size={15} />
        </Button>
      </div>
    </div>
  )
}
