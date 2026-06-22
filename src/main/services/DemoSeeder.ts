import type { ContentService } from './ContentService'
import type { ContentItem } from '@shared/types'

/**
 * Seeds a handful of demonstration entries so a fresh vault is never empty.
 * Only runs when the vault has no content yet.
 */
export async function seedDemoContent(content: ContentService): Promise<number> {
  const existing = await content.list()
  if (existing.length > 0) return 0

  const now = new Date().toISOString()
  const base = {
    favorite: false,
    createdAt: now,
    updatedAt: now,
    images: [],
    links: [],
    attachments: [],
    relPath: ''
  }

  const demos: Array<Omit<ContentItem, 'id'>> = [
    {
      ...base,
      title: 'Ember Sorceress — League Starter',
      type: 'starter',
      className: 'Sorceress',
      ascendancy: 'Stormweaver',
      gameVersion: '0.3',
      league: 'Standard',
      tags: ['starter', 'caster', 'budget-friendly'],
      status: 'validated',
      favorite: true,
      confidence: 4,
      links: [{ label: 'Community wiki', url: 'https://www.poe2wiki.net/' }],
      content: `# Ember Sorceress — League Starter

A forgiving caster starter built around stacking elemental damage and staying mobile.

> [!tip] Why this starter?
> Cheap to gear, scales smoothly into maps, and teaches the fundamentals of ailments.

## Leveling priorities
- [ ] Grab life/ES nodes early
- [ ] Pick up two damage clusters before act 3
- [ ] Swap to a +levels weapon ASAP

## Defenses
Use a granite-style flask analogue and keep your shock uptime high.
`,
      build: {
        summary: 'Forgiving elemental caster that ramps with ailments.',
        pros: '- Cheap\n- Strong clear\n- Beginner-friendly',
        cons: '- Squishy if greedy\n- Mana hungry early',
        budget: 'low',
        priorityStats: '- Spell damage\n- Cast speed\n- Maximum life / ES',
        mainSkills: '- **Spark / Lightning bolt**\n  - Added Lightning\n  - Cast Speed',
        progressionEarly: 'Focus on survivability nodes and a reliable single-target.',
        progressionMid: 'Transition into ailment scaling and pick a herald.',
        progressionEndgame: 'Stack penetration and quality-of-life movement.'
      }
    },
    {
      ...base,
      title: 'Mapping Atlas Strategy — Currency First',
      type: 'atlas',
      gameVersion: '0.3',
      league: 'Standard',
      tags: ['atlas', 'farming', 'currency'],
      status: 'testing',
      confidence: 3,
      content: `# Atlas Strategy — Currency First

A pragmatic atlas routing focused on raw currency and stackable rewards.

## Order of operations
1. Open the atlas and prioritize connected nodes
2. Run your most comfortable map layout
3. Re-invest drops into more maps

> [!important] Sustain
> Keep at least 10 maps of your tier in reserve before pushing higher.
`
    },
    {
      ...base,
      title: 'Crafting Notes — Early Resistances',
      type: 'crafting',
      gameVersion: '0.3',
      tags: ['crafting', 'gearing'],
      status: 'draft',
      confidence: 2,
      content: `# Crafting Notes — Early Resistances

Quick reference for patching resistances on a budget.

\`\`\`
Target: 75% / 75% / 75% before maps
\`\`\`

> [!warning] Don't overspend
> Rare gear with two good resists beats a single expensive piece early on.
`
    }
  ]

  let created = 0
  for (const d of demos) {
    await content.save({ ...d, id: '' } as ContentItem)
    created++
  }
  return created
}
