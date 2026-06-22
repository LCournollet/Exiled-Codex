import type { ContentType, ContentStatus, BudgetTier } from '@shared/types'

/** Tiny classnames helper (no dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return iso
  }
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export const TYPE_LABEL: Record<ContentType, string> = {
  starter: 'League Starter',
  build: 'Build',
  guide: 'Guide',
  note: 'Note',
  tree: 'Skill Tree',
  leveling: 'Leveling',
  farming: 'Farming',
  bossing: 'Bossing',
  crafting: 'Crafting',
  atlas: 'Atlas',
  class: 'Class / Ascendancy',
  other: 'Other'
}

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  testing: 'Testing',
  validated: 'Validated',
  archived: 'Archived'
}

export const STATUS_STYLE: Record<ContentStatus, string> = {
  draft: 'text-ivory-faint border-stone-border bg-obsidian-800',
  testing: 'text-ember-glow border-ember/40 bg-ember/10',
  validated: 'text-emerald-300 border-emerald-700/40 bg-emerald-900/20',
  archived: 'text-ivory-faint border-stone-border bg-obsidian-900'
}

export const BUDGET_LABEL: Record<BudgetTier, string> = {
  low: 'Low budget',
  medium: 'Mid budget',
  high: 'High budget'
}

export function confidenceLabel(level?: number): string {
  if (!level) return 'Unrated'
  return ['', 'Rough idea', 'Early test', 'Promising', 'Solid', 'Battle-tested'][level] || 'Unrated'
}
