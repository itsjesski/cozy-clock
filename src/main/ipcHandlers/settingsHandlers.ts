/**
 * Settings-related IPC handlers
 */

import { ipcMain, BrowserWindow } from 'electron'
import DataStore from '../store'
import * as ipc from '../../shared/ipc'
import type { AppSettings } from '../../types'
import { logError } from '../logger'

const store = new DataStore()

function applyWindowSettings(window: BrowserWindow, settings: AppSettings): void {
  window.setAlwaysOnTop(!!settings.alwaysOnTop)

  if (settings.compactMode) {
    window.setMinimumSize(360, 520)
    window.setSize(480, 640)
  } else {
    window.setMinimumSize(800, 600)
    const bounds = window.getBounds()
    if (bounds.width < 800 || bounds.height < 600) {
      window.setSize(1200, 800)
    }
  }
}

export function registerSettingsHandlers(): void {
  /**
   * Get current settings
   */
  ipcMain.handle(ipc.IPC_SETTINGS_GET, async () => {
    try {
      const settings = store.getSettings()
      return { success: true, data: settings }
    } catch (error) {
      console.error('Error getting settings:', error)
      logError('Error getting settings', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Update settings
   */
  ipcMain.handle(
    ipc.IPC_SETTINGS_UPDATE,
    async (_event, { settings }: { settings: Partial<AppSettings> }) => {
      try {
        store.updateSettings(settings)
        const updated = store.getSettings()

        BrowserWindow.getAllWindows().forEach((window) => {
          applyWindowSettings(window, updated)
        })

        // Broadcast to all windows
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(ipc.IPC_SETTINGS_UPDATE, { settings: updated })
        })

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error updating settings:', error)
        logError('Error updating settings', error)
        return { success: false, error: String(error) }
      }
    },
  )
}
