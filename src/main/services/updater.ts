/**
 * Auto-update logic using electron-updater
 */

import { autoUpdater } from 'electron-updater'
import isDev from 'electron-is-dev'

type UpdaterCallbacks = {
  onUpdateAvailable?: () => void
  onDownloadProgress?: (percent: number) => void
  onUpdateReady?: () => void
  onUpdateError?: (message: string) => void
}

let hasUpdate = false
let updaterInitialized = false

export function initializeUpdater(callbacks: UpdaterCallbacks = {}) {
  if (isDev) {
    return
  }

  if (updaterInitialized) {
    return
  }

  updaterInitialized = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    const files = Array.isArray(info.files) ? info.files : []
    const hasValidInstaller = files.some((file) => {
      const url = (file.url || '').toLowerCase()
      return url.endsWith('.exe') || url.endsWith('.msi')
    })

    if (!hasValidInstaller) {
      callbacks.onUpdateError?.('Update found but no Windows installer was included in the release.')
      return
    }

    hasUpdate = true
    callbacks.onUpdateAvailable?.()
  })

  autoUpdater.on('download-progress', (progressObj) => {
    callbacks.onDownloadProgress?.(Math.round(progressObj.percent || 0))
  })

  autoUpdater.on('update-downloaded', () => {
    callbacks.onUpdateReady?.()
  })

  autoUpdater.on('error', (error) => {
    callbacks.onUpdateError?.(error?.message || 'Auto-updater error')
  })

  autoUpdater.checkForUpdates()

  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 60 * 60 * 1000) // Check every hour
}

export async function startUpdateDownload(): Promise<{ success: boolean; error?: string }> {
  if (isDev) {
    return { success: false, error: 'Updater is disabled in development mode.' }
  }

  if (!hasUpdate) {
    return { success: false, error: 'No update is currently available.' }
  }

  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export function installDownloadedUpdate(): { success: boolean; error?: string } {
  if (isDev) {
    return { success: false, error: 'Updater is disabled in development mode.' }
  }

  try {
    autoUpdater.quitAndInstall()
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
