import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@shared/appInfo'
import logoUrl from '../assets/logo.png'

/**
 * Front-end app configuration. Change these (and src/shared/appInfo.ts) to rebrand.
 * To swap the logo, replace src/renderer/src/assets/logo.png and assets/logo/logo.png.
 */
export const appConfig = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  version: APP_VERSION,
  logo: logoUrl,
  /** Default suggested GitHub repo name shown to the user in the GitHub panel. */
  suggestedRepoName: 'exile-codex-vault'
}
