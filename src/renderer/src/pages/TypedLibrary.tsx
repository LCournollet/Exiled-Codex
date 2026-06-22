import { ContentBrowser } from '../components/ContentBrowser'
import type { ContentType } from '@shared/types'
import { useT } from '../i18n'

const SUB_KEY: Partial<Record<ContentType, string>> = {
  build: 'browser.sub.build',
  starter: 'browser.sub.starter',
  guide: 'browser.sub.guide'
}

export function TypedLibrary({ type }: { type: ContentType }) {
  const { t } = useT()
  const pluralKey = `type.${type}.plural`
  const plural = t(pluralKey)
  // Fall back to the singular label + "s" if no dedicated plural exists.
  const title = plural === pluralKey ? `${t(`type.${type}`)}s` : plural
  const subKey = SUB_KEY[type]
  return <ContentBrowser lockType={type} title={title} subtitle={subKey ? t(subKey) : undefined} />
}
