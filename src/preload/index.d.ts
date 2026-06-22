import type { ElectronAPI } from '@electron-toolkit/preload'
import type { ExileApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ExileApi
  }
}

export {}
