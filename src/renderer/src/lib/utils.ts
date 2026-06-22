import type { ContentStatus, AppLanguage } from '@shared/types'
import { translate } from '../i18n/translate'

/** Tiny classnames helper (no dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const LOCALE: Record<AppLanguage, string> = { en: 'en-US', fr: 'fr-FR' }

export function formatDate(iso: string, lang: AppLanguage = 'en'): string {
  try {
    return new Date(iso).toLocaleDateString(LOCALE[lang], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return iso
  }
}

export function formatRelative(iso: string, lang: AppLanguage = 'en'): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return translate(lang, 'time.justNow')
  if (mins < 60) return translate(lang, 'time.mAgo', { n: mins })
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return translate(lang, 'time.hAgo', { n: hrs })
  const days = Math.round(hrs / 24)
  if (days < 30) return translate(lang, 'time.dAgo', { n: days })
  return formatDate(iso, lang)
}

/** Status pill colors (text styling only — labels live in i18n). */
export const STATUS_STYLE: Record<ContentStatus, string> = {
  draft: 'text-ivory-faint border-stone-border bg-obsidian-800',
  testing: 'text-ember-glow border-ember/40 bg-ember/10',
  validated: 'text-emerald-300 border-emerald-700/40 bg-emerald-900/20',
  archived: 'text-ivory-faint border-stone-border bg-obsidian-900'
}

export function confidenceLabel(lang: AppLanguage, level?: number): string {
  return translate(lang, `confidence.${level ?? 0}`)
}
