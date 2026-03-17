/**
 * Electron preload script - creates a secure context bridge
 * between the main process and renderer process
 */

import { contextBridge, ipcRenderer } from 'electron'
import type {
  IpcCreateTimer,
  AppSettings,
  StatsPeriod,
  StatsResetScope,
  TimerPeriodStats,
} from './types'

import * as ipc from './shared/ipc'

// Define the API exposed to renderer process
const api = {
  // Timer operations
  getTimers: () => ipcRenderer.invoke(ipc.IPC_TIMER_LIST),
  createTimer: (config: IpcCreateTimer) => ipcRenderer.invoke(ipc.IPC_TIMER_CREATE, config),
  updateTimer: (id: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke(ipc.IPC_TIMER_UPDATE, { id, updates }),
  deleteTimer: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_DELETE, { id }),
  startTimer: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_START, { id }),
  pauseTimer: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_PAUSE, { id }),
  resumeTimer: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_RESUME, { id }),
  nextTimerPhase: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_NEXT_PHASE, { id }),
  resetTimer: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_RESET, { id }),
  getTimerState: (id: string) => ipcRenderer.invoke(ipc.IPC_TIMER_GET_STATE, { id }),

  // Settings
  getSettings: () => ipcRenderer.invoke(ipc.IPC_SETTINGS_GET),
  updateSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke(ipc.IPC_SETTINGS_UPDATE, { settings }),

  // Stats
  getStats: (period: StatsPeriod) =>
    ipcRenderer.invoke(ipc.IPC_STATS_GET, { period }),
  resetStats: (categories: string[], scope?: StatsResetScope) =>
    ipcRenderer.invoke(ipc.IPC_STATS_RESET, { categories, scope }),
  getTimerStats: (id: string): Promise<{ success: boolean; data?: TimerPeriodStats; error?: string }> =>
    ipcRenderer.invoke(ipc.IPC_TIMER_STATS_GET, { id }),
  exportAllStatsCsv: () => ipcRenderer.invoke(ipc.IPC_STATS_EXPORT_CSV),

  // Streamer mode
  streamerWindow: (id: string, action: 'open' | 'close' | 'toggle', config?: any) =>
    ipcRenderer.invoke(ipc.IPC_STREAMER_WINDOW, { id, action, config }),

  // App lifecycle
  quitApp: () => ipcRenderer.invoke(ipc.IPC_APP_QUIT),
  openUpdatesPage: () => ipcRenderer.invoke(ipc.IPC_APP_OPEN_UPDATES),
  openLogs: () => ipcRenderer.invoke(ipc.IPC_APP_OPEN_LOGS),
  pickSoundFile: () => ipcRenderer.invoke(ipc.IPC_APP_PICK_SOUND_FILE),
  resolveSoundSource: (soundPath: string) =>
    ipcRenderer.invoke(ipc.IPC_APP_RESOLVE_SOUND_SOURCE, { soundPath }),
  startUpdateDownload: () => ipcRenderer.invoke(ipc.IPC_APP_UPDATE_DOWNLOAD),
  installDownloadedUpdate: () => ipcRenderer.invoke(ipc.IPC_APP_UPDATE_INSTALL),
  minimizeWindow: () => ipcRenderer.invoke(ipc.IPC_WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(ipc.IPC_WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(ipc.IPC_WINDOW_CLOSE),

  // Port conflict modal
  updateServerPort: (port: number) => ipcRenderer.send(ipc.IPC_PORT_UPDATE, port),
  cancelPortChange: () => ipcRenderer.send(ipc.IPC_PORT_CANCEL),

  // Event listeners
  onTimerTick: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_TIMER_TICK, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_TIMER_TICK, listener)
  },
  onTimerAlert: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_TIMER_ALERT, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_TIMER_ALERT, listener)
  },
  onMascotAnimate: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_MASCOT_ANIMATE, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_MASCOT_ANIMATE, listener)
  },
  onUpdateAvailable: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_APP_UPDATE_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_APP_UPDATE_AVAILABLE, listener)
  },
  onUpdateProgress: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_APP_UPDATE_PROGRESS, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_APP_UPDATE_PROGRESS, listener)
  },
  onUpdateReady: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_APP_UPDATE_READY, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_APP_UPDATE_READY, listener)
  },
  onUpdateError: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_APP_UPDATE_ERROR, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_APP_UPDATE_ERROR, listener)
  },
  onTimerStateUpdate: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_TIMER_STATE_UPDATE, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_TIMER_STATE_UPDATE, listener)
  },
  onStatsUpdate: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_STATS_UPDATE, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_STATS_UPDATE, listener)
  },
  onSettingsUpdate: (callback: (data: any) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(ipc.IPC_SETTINGS_UPDATE, listener)
    return () => ipcRenderer.removeListener(ipc.IPC_SETTINGS_UPDATE, listener)
  },

  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners(ipc.IPC_TIMER_TICK)
    ipcRenderer.removeAllListeners(ipc.IPC_TIMER_ALERT)
    ipcRenderer.removeAllListeners(ipc.IPC_MASCOT_ANIMATE)
    ipcRenderer.removeAllListeners(ipc.IPC_APP_UPDATE_AVAILABLE)
    ipcRenderer.removeAllListeners(ipc.IPC_APP_UPDATE_PROGRESS)
    ipcRenderer.removeAllListeners(ipc.IPC_APP_UPDATE_READY)
    ipcRenderer.removeAllListeners(ipc.IPC_APP_UPDATE_ERROR)
    ipcRenderer.removeAllListeners(ipc.IPC_TIMER_STATE_UPDATE)
    ipcRenderer.removeAllListeners(ipc.IPC_STATS_UPDATE)
    ipcRenderer.removeAllListeners(ipc.IPC_SETTINGS_UPDATE)
  },
}

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: typeof api
  }
}
