import { ContentBrowser } from '../components/ContentBrowser'
import type { ContentType } from '@shared/types'
import { TYPE_LABEL } from '../lib/utils'

const SUBTITLES: Partial<Record<ContentType, string>> = {
  build: 'Structured build sheets — skills, gear, defenses and progression.',
  starter: 'League starters: cheap, reliable, beginner-friendly entries.',
  guide: 'Written guides, strategies and how-tos.'
}

export function TypedLibrary({ type }: { type: ContentType }) {
  return (
    <ContentBrowser
      lockType={type}
      title={`${TYPE_LABEL[type]}s`}
      subtitle={SUBTITLES[type]}
    />
  )
}
