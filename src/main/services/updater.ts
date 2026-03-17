/**
 * Update logic using GitHub latest release assets
 */

import isDev from 'electron-is-dev'
import { app, shell } from 'electron'
import fs from 'fs'
import path from 'path'

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
let updaterCallbacks: UpdaterCallbacks = {}
let latestInstallerAsset: { name: string; url: string } | null = null
let downloadedInstallerPath: string | null = null

const RELEASES_LATEST_URL = 'https://api.github.com/repos/itsjesski/cozy-clock/releases/latest'
const UPDATER_USER_AGENT = 'cozy-clock-updater'

type GitHubReleaseAsset = {
  name?: string
  browser_download_url?: string
}

type GitHubLatestReleaseResponse = {
  tag_name?: string
  assets?: GitHubReleaseAsset[]
}

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
        'User-Agent': UPDATER_USER_AGENT,
      },
    })

    if (!response.ok) {
      hasUpdate = false
      latestInstallerAsset = null
      return
    }

    const data = await response.json() as GitHubLatestReleaseResponse
    const tagName = data.tag_name || ''
    if (!tagName) {
      hasUpdate = false
      latestInstallerAsset = null
      return
    }

    const exeAsset = (data.assets || []).find((asset) => {
      const name = asset.name?.toLowerCase() || ''
      const url = asset.browser_download_url || ''
      return name.endsWith('.exe') && url.length > 0
    })

    if (!exeAsset?.name || !exeAsset.browser_download_url) {
      hasUpdate = false
      latestInstallerAsset = null
      return
    }

    const isNewer = isRemoteVersionNewer(tagName, app.getVersion())
    hasUpdate = isNewer
    if (!isNewer) {
      latestInstallerAsset = null
      return
    }

    latestInstallerAsset = {
      name: exeAsset.name,
      url: exeAsset.browser_download_url,
    }
    updateReady = false
    updateProgress = 0
    updateError = null
    isDownloading = false
    callbacks.onUpdateAvailable?.()
  } catch {
    hasUpdate = false
    latestInstallerAsset = null
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
  updaterCallbacks = callbacks
  void checkLatestReleaseOnStartup(callbacks)
}

export async function startUpdateDownload(): Promise<{ success: boolean; error?: string }> {
  if (isDev) {
    return { success: false, error: 'Updater is disabled in development mode.' }
  }

  if (!hasUpdate || !latestInstallerAsset) {
    return { success: false, error: 'No update is currently available.' }
  }

  try {
    updateError = null
    isDownloading = true
    updateReady = false
    updateProgress = 0
    updaterCallbacks.onDownloadProgress?.(0)

    const updateDir = path.join(app.getPath('temp'), 'cozy-clock-updates')
    fs.mkdirSync(updateDir, { recursive: true })

    const targetPath = path.join(updateDir, latestInstallerAsset.name)
    downloadedInstallerPath = targetPath

    const response = await fetch(latestInstallerAsset.url, {
      headers: {
        Accept: 'application/octet-stream',
        'User-Agent': UPDATER_USER_AGENT,
      },
    })

    if (!response.ok || !response.body) {
      throw new Error(`Cannot download "${latestInstallerAsset.url}", status ${response.status}`)
    }

    const totalBytes = Number(response.headers.get('content-length') || 0)
    const reader = response.body.getReader()
    const output = fs.createWriteStream(targetPath)
    let downloadedBytes = 0

    await new Promise<void>((resolve, reject) => {
      output.on('error', reject)
      output.on('finish', resolve)

      const pump = (): void => {
        reader.read().then(({ done, value }) => {
          if (done) {
            output.end()
            return
          }

          if (value) {
            downloadedBytes += value.length
            output.write(Buffer.from(value))

            if (totalBytes > 0) {
              updateProgress = Math.max(0, Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)))
              updaterCallbacks.onDownloadProgress?.(updateProgress)
            }
          }

          pump()
        }).catch(reject)
      }

      pump()
    })

    isDownloading = false
    updateReady = true
    updateProgress = 100
    updaterCallbacks.onDownloadProgress?.(100)
    updaterCallbacks.onUpdateReady?.()
    return { success: true }
  } catch (error) {
    isDownloading = false
    updateError = String(error)
    updaterCallbacks.onUpdateError?.(updateError)
    return { success: false, error: updateError }
  }
}

export async function installDownloadedUpdate(): Promise<{ success: boolean; error?: string }> {
  if (isDev) {
    return { success: false, error: 'Updater is disabled in development mode.' }
  }

  if (!downloadedInstallerPath) {
    return { success: false, error: 'No downloaded installer found.' }
  }

  try {
    const openResult = await shell.openPath(downloadedInstallerPath)
    if (openResult) {
      return { success: false, error: openResult }
    }

    setTimeout(() => {
      app.quit()
    }, 500)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
