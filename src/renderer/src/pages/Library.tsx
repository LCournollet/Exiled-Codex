import { ContentBrowser } from '../components/ContentBrowser'
import { useT } from '../i18n'

export function Library() {
  const { t } = useT()
  return <ContentBrowser title={t('browser.library')} subtitle={t('browser.librarySub')} />
}
