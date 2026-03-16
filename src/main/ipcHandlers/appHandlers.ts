/**
 * App/window lifecycle IPC handlers
 */

import { BrowserWindow, ipcMain, app, shell } from 'electron'
import * as ipc from '../../shared/ipc'
import { installDownloadedUpdate, startUpdateDownload } from '../updater'
import { getLogDirectory, logError } from '../logger'
import DataStore from '../store'
import { hideMainWindowToTray, isTrayReady, initializeTray } from '../tray'

const store = new DataStore()

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

  ipcMain.handle(ipc.IPC_APP_UPDATE_DOWNLOAD, async () => {
    return startUpdateDownload()
  })

  ipcMain.handle(ipc.IPC_APP_UPDATE_INSTALL, async () => {
    return installDownloadedUpdate()
  })

  ipcMain.handle(ipc.IPC_WINDOW_MINIMIZE, async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        if (store.getSettings().minimizeToTray && (isTrayReady() || initializeTray())) {
          hideMainWindowToTray()
        } else {
          window.minimize()
        }
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
