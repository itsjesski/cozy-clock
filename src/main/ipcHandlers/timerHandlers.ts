/**
 * Timer-related IPC handlers
 */

import { ipcMain, BrowserWindow } from 'electron'
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  deleteTimer,
  createAndLoadTimer,
  updateTimerConfig,
  getTimerState,
  getStoredTimerStatesForConfiguredTimers,
} from '../timerEngine'
import * as ipc from '../../shared/ipc'
import type { TimerConfig } from '../../types'
import DataStore from '../store'

const store = new DataStore()

export function registerTimerHandlers(): void {
  ipcMain.handle(ipc.IPC_TIMER_LIST, async () => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        const restoredStates = getStoredTimerStatesForConfiguredTimers()
        if (Object.keys(restoredStates).length > 0) {
          mainWindow.webContents.send(ipc.IPC_TIMER_STATE_UPDATE, {
            states: restoredStates,
          })
        }
      }
      return { success: true, data: store.getTimers() }
    } catch (error) {
      console.error('Error listing timers:', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Create a new timer
   */
  ipcMain.handle(ipc.IPC_TIMER_CREATE, async (_event, config: TimerConfig) => {
    try {
      createAndLoadTimer(config)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send(ipc.IPC_TIMER_STATE_UPDATE, {
          states: { [config.id]: getTimerState(config.id) },
        })
      }
      return { success: true, id: config.id }
    } catch (error) {
      console.error('Error creating timer:', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Update timer configuration
   */
  ipcMain.handle(
    ipc.IPC_TIMER_UPDATE,
    async (_event, { id, updates }: { id: string; updates: Partial<TimerConfig> }) => {
      try {
        updateTimerConfig(id, updates)
        const state = getTimerState(id)
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow && state) {
          mainWindow.webContents.send(ipc.IPC_TIMER_STATE_UPDATE, {
            states: { [id]: state },
          })
        }
        return { success: true }
      } catch (error) {
        console.error('Error updating timer config:', error)
        return { success: false, error: String(error) }
      }
    },
  )

  /**
   * Delete a timer
   */
  ipcMain.handle(ipc.IPC_TIMER_DELETE, async (_event, { id }: { id: string }) => {
    try {
      deleteTimer(id)
      return { success: true }
    } catch (error) {
      console.error('Error deleting timer:', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Start a timer
   */
  ipcMain.handle(ipc.IPC_TIMER_START, async (_event, { id }: { id: string }) => {
    try {
      startTimer(id)
      return { success: true }
    } catch (error) {
      console.error('Error starting timer:', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Pause a timer
   */
  ipcMain.handle(ipc.IPC_TIMER_PAUSE, async (_event, { id }: { id: string }) => {
    try {
      pauseTimer(id)
      return { success: true }
    } catch (error) {
      console.error('Error pausing timer:', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Resume a timer
   */
  ipcMain.handle(ipc.IPC_TIMER_RESUME, async (_event, { id }: { id: string }) => {
    try {
      resumeTimer(id)
      return { success: true }
    } catch (error) {
      console.error('Error resuming timer:', error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * Reset a timer
   */
  ipcMain.handle(ipc.IPC_TIMER_RESET, async (_event, { id }: { id: string }) => {
    try {
      resetTimer(id)
      const state = getTimerState(id)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow && state) {
        mainWindow.webContents.send(ipc.IPC_TIMER_STATE_UPDATE, {
          states: { [id]: state },
        })
      }
      return { success: true }
    } catch (error) {
      console.error('Error resetting timer:', error)
      return { success: false, error: String(error) }
    }
  })
}
