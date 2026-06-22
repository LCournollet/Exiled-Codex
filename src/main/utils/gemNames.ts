/**
 * Resolves Path of Exile 2 gem metadata ids (e.g.
 * "Metadata/Items/Gems/SupportGemPinpointCritical") into readable display names
 * ("Pinpoint Critical").
 *
 * There is no official gem dataset bundled with the app, so this combines:
 *  1. a curated OVERRIDES dictionary for names the heuristic gets wrong, and
 *  2. a robust heuristic (strip prefixes + internal tier suffixes, split camelCase,
 *     lowercase joining words).
 *
 * To improve accuracy, add entries to OVERRIDES keyed by the id tail
 * (the part after the last "/", e.g. "SupportGemUruksSmelting").
 */

/** Exact overrides keyed by the id tail. Extend freely. */
const OVERRIDES: Record<string, string> = {
  // Examples / known quirks (apostrophes the heuristic can't infer):
  SupportGemUruksSmelting: "Uruk's Smelting",
  SupportGemKhatalsRejuvenation: "Khatal's Rejuvenation"
}

const JOIN_WORDS = new Set(['of', 'the', 'and', 'to', 'in', 'a', 'for', 'on', 'with'])
const TIER_SUFFIX = /(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)$/

export function gemDisplayName(metadataId: string): string {
  const tail = metadataId.split('/').pop() || metadataId
  if (OVERRIDES[tail]) return OVERRIDES[tail]

  let core = tail.replace(/^SkillGem/, '').replace(/^SupportGem/, '')
  // Strip internal tier suffix (MagnifiedEffectTwo -> MagnifiedEffect).
  core = core.replace(TIER_SUFFIX, '')

  // Split camelCase / digit boundaries into words.
  const words = core
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return words
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (i > 0 && JOIN_WORDS.has(lower)) return lower
      return w
    })
    .join(' ')
}
