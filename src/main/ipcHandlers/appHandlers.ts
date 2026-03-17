/**
 * App/window lifecycle IPC handlers
 */

import { BrowserWindow, ipcMain, app, shell, dialog } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import * as ipc from '../../shared/ipc'
import { getUpdaterStatus, installDownloadedUpdate, startUpdateDownload } from '../services/updater'
import { getLogDirectory, logError } from '../services/logger'

function inferAudioMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.ogg') return 'audio/ogg'
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.flac') return 'audio/flac'
  if (ext === '.aac') return 'audio/aac'
  return 'application/octet-stream'
}

export function registerAppHandlers(): void {
  ipcMain.handle(ipc.IPC_APP_QUIT, async () => {
    try {
      app.quit()
      return { success: true }
    } catch (error) {
      console.error('Error quitting app:', error)
      logError('Error quitting app', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(ipc.IPC_APP_OPEN_UPDATES, async () => {
    try {
      await shell.openExternal('https://github.com/itsjesski/CozyClock/releases')
      return { success: true }
    } catch (error) {
      console.error('Error opening updates page:', error)
      logError('Error opening updates page', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(ipc.IPC_APP_OPEN_LOGS, async () => {
    try {
      const result = await shell.openPath(getLogDirectory())
      if (result) {
        throw new Error(result)
      }
      return { success: true }
    } catch (error) {
      console.error('Error opening logs directory:', error)
      logError('Error opening logs directory', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(ipc.IPC_APP_PICK_SOUND_FILE, async (event) => {
    try {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender)
      const pickerOptions: Electron.OpenDialogOptions = {
        title: 'Select Sound File',
        properties: ['openFile'],
        filters: [
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] },
        ],
      }
      const result = ownerWindow
        ? await dialog.showOpenDialog(ownerWindow, pickerOptions)
        : await dialog.showOpenDialog(pickerOptions)

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, filePath: result.filePaths[0] }
    } catch (error) {
      console.error('Error picking sound file:', error)
      logError('Error picking sound file', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    ipc.IPC_APP_RESOLVE_SOUND_SOURCE,
    async (_event, { soundPath }: { soundPath: string }) => {
      try {
        if (!soundPath || typeof soundPath !== 'string') {
          return { success: false, error: 'Invalid sound path.' }
        }

        if (soundPath.startsWith('data:') || soundPath.startsWith('http://') || soundPath.startsWith('https://')) {
          return { success: true, source: soundPath }
        }

        const localPath = soundPath.startsWith('file://')
          ? fileURLToPath(soundPath)
          : soundPath

        const fileBuffer = await fs.readFile(localPath)
        const mimeType = inferAudioMimeType(localPath)
        const source = `data:${mimeType};base64,${fileBuffer.toString('base64')}`
        return { success: true, source }
      } catch (error) {
        console.error('Error resolving sound source:', error)
        logError('Error resolving sound source', error)
        return { success: false, error: String(error) }
      }
    },
  )

  ipcMain.handle(ipc.IPC_APP_UPDATE_DOWNLOAD, async () => {
    return startUpdateDownload()
  })

  ipcMain.handle(ipc.IPC_APP_UPDATE_STATUS, async () => {
    return { success: true, data: getUpdaterStatus() }
  })

  ipcMain.handle(ipc.IPC_APP_UPDATE_INSTALL, async () => {
    return installDownloadedUpdate()
  })

  ipcMain.handle(ipc.IPC_WINDOW_MINIMIZE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        window.minimize()
      }
      return { success: true }
    } catch (error) {
      console.error('Error minimizing window:', error)
      logError('Error minimizing window', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(ipc.IPC_WINDOW_MAXIMIZE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize()
        } else {
          window.maximize()
        }
      }
      return { success: true }
    } catch (error) {
      console.error('Error maximizing window:', error)
      logError('Error maximizing window', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(ipc.IPC_WINDOW_CLOSE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      window?.close()
      return { success: true }
    } catch (error) {
      console.error('Error closing window:', error)
      logError('Error closing window', error)
      return { success: false, error: String(error) }
    }
  })
}
