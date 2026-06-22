import { useStore } from '../store/useStore'
import type { AppLanguage } from '@shared/types'
import { translate, TFunc } from './translate'

export * from './translate'

/** Hook returning a translator bound to the current UI language. */
export function useT(): { t: TFunc; lang: AppLanguage } {
  const lang = useStore((s) => s.settings?.language ?? 'en')
  return { t: (key, vars) => translate(lang, key, vars), lang }
}
