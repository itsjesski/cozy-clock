/**
 * Auto-update logic using electron-updater
 */

import { autoUpdater } from 'electron-updater'
import isDev from 'electron-is-dev'
import { app } from 'electron'

type UpdaterCallbacks = {
  onUpdateAvailable?: () => void
  onDownloadProgress?: (percent: number) => void
  onUpdateReady?: () => void
  onUpdateError?: (message: string) => void
}

export type UpdaterStatus = {
  isUpdateAvailable: boolean
  isDownloadingUpdate: boolean
  isUpdateReady: boolean
  updateProgress: number
  updateError: string | null
}

let hasUpdate = false
let updaterInitialized = false
let updateReady = false
let updateProgress = 0
let updateError: string | null = null
let isDownloading = false

const RELEASES_LATEST_URL = 'https://api.github.com/repos/itsjesski/cozy-clock/releases/latest'

function normalizeVersion(version: string): number[] {
  const core = version.trim().replace(/^v/i, '').split('-')[0]
  const parts = core.split('.').map((part) => Number.parseInt(part, 10))
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

function isRemoteVersionNewer(remoteVersion: string, localVersion: string): boolean {
  const remote = normalizeVersion(remoteVersion)
  const local = normalizeVersion(localVersion)

  for (let index = 0; index < 3; index += 1) {
    if (remote[index] > local[index]) return true
    if (remote[index] < local[index]) return false
  }

  return false
}

async function checkLatestReleaseOnStartup(callbacks: UpdaterCallbacks): Promise<void> {
  try {
    const response = await fetch(RELEASES_LATEST_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'cozy-clock-updater',
      },
    })

    if (!response.ok) {
      return
    }

    const data = await response.json() as { tag_name?: string }
    const tagName = data.tag_name || ''
    if (!tagName) {
      return
    }

    const isNewer = isRemoteVersionNewer(tagName, app.getVersion())
    hasUpdate = isNewer
    if (!isNewer) {
      return
    }

    updateReady = false
    updateProgress = 0
    updateError = null
    isDownloading = false
    callbacks.onUpdateAvailable?.()
  } catch {
    // Ignore release API failures; autoUpdater flow may still succeed.
  }
}

export function getUpdaterStatus(): UpdaterStatus {
  return {
    isUpdateAvailable: hasUpdate,
    isDownloadingUpdate: isDownloading,
    isUpdateReady: updateReady,
    updateProgress,
    updateError,
  }
}

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

  autoUpdater.on('update-available', () => {
    hasUpdate = true
    updateReady = false
    updateProgress = 0
    updateError = null
    isDownloading = false
    callbacks.onUpdateAvailable?.()
  })

  autoUpdater.on('update-not-available', () => {
    hasUpdate = false
    updateReady = false
    updateProgress = 0
    updateError = null
    isDownloading = false
  })

  autoUpdater.on('download-progress', (progressObj) => {
    isDownloading = true
    updateProgress = Math.round(progressObj.percent || 0)
    callbacks.onDownloadProgress?.(updateProgress)
  })

  autoUpdater.on('update-downloaded', () => {
    isDownloading = false
    updateReady = true
    updateProgress = 100
    callbacks.onUpdateReady?.()
  })

  autoUpdater.on('error', (error) => {
    isDownloading = false
    updateError = error?.message || 'Auto-updater error'
    callbacks.onUpdateError?.(updateError)
  })

  void checkLatestReleaseOnStartup(callbacks)
  autoUpdater.checkForUpdates()
}

export async function startUpdateDownload(): Promise<{ success: boolean; error?: string }> {
  if (isDev) {
    return { success: false, error: 'Updater is disabled in development mode.' }
  }

  if (!hasUpdate) {
    return { success: false, error: 'No update is currently available.' }
  }

  try {
    updateError = null
    isDownloading = true
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    isDownloading = false
    updateError = String(error)
    return { success: false, error: updateError }
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
