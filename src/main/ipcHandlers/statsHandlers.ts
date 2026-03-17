/**
 * Stats-related IPC handlers
 */

import { BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import * as ipc from '../../shared/ipc'
import type { StatsPeriod, StatsResetScope } from '../../types'
import {
  exportAllTimerStatsCsv,
  getStatsOverview,
  getTimerPeriodStats,
  resetStats,
} from '../services/statsService'
import { getTodayDate } from '../../shared/utils'

export function registerStatsHandlers(): void {
  /**
   * Get stats for a specific period
   */
  ipcMain.handle(
    ipc.IPC_STATS_GET,
    async (_event, { period }: { period: StatsPeriod }) => {
      try {
        return { success: true, data: getStatsOverview(period) }
      } catch (error) {
        console.error('Error getting stats:', error)
        return { success: false, error: String(error) }
      }
    },
  )

  /**
   * Reset stats
   */
  ipcMain.handle(
    ipc.IPC_STATS_RESET,
    async (_event, { categories, scope }: { categories: string[]; scope?: StatsResetScope }) => {
      try {
        const updated = resetStats(categories, scope)
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(ipc.IPC_STATS_UPDATE, updated)
        })
        return { success: true, data: updated }
      } catch (error) {
        console.error('Error resetting stats:', error)
        return { success: false, error: String(error) }
      }
    },
  )

  ipcMain.handle(ipc.IPC_TIMER_STATS_GET, async (_event, { id }: { id: string }) => {
    try {
      return { success: true, data: getTimerPeriodStats(id) }
    } catch (error) {
      console.error('Error getting timer stats:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(ipc.IPC_STATS_EXPORT_CSV, async () => {
    try {
      const csv = exportAllTimerStatsCsv()
      const saveResult = await dialog.showSaveDialog({
        title: 'Export Timer Stats CSV',
        defaultPath: path.join(process.cwd(), `cozy-clock-timer-stats-${getTodayDate()}.csv`),
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, canceled: true }
      }

      await fs.writeFile(saveResult.filePath, csv, 'utf8')
      return { success: true, filePath: saveResult.filePath }
    } catch (error) {
      console.error('Error exporting timer stats CSV:', error)
      return { success: false, error: String(error) }
    }
  })
}
