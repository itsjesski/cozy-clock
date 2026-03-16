/**
 * Typed electron-store wrapper for Cozy Clock data persistence
 */

import Store from 'electron-store'
import type {
  StoredData,
  TimerConfig,
  TimerState,
  GlobalStats,
  StatsHistory,
  TimerStatsHistoryEntry,
  AppSettings,
} from '../types'
import { DEFAULT_THEME } from '../shared/constants'

function createEmptyStats(): GlobalStats {
  return {
    sitTime: 0,
    standTime: 0,
    pomodoroWorkTime: 0,
    pomodoroBreakTime: 0,
    genericTimerTime: 0,
    lastResetAt: Date.now(),
  }
}

class DataStore {
  private store: Store<StoredData>

  constructor() {
    this.store = new Store<StoredData>({
      name: 'cozy-clock-config',
    })

    // Initialize default values if not present
    if (!this.store.has('timers')) {
      this.store.set('timers', [])
    }
    if (!this.store.has('timerStates')) {
      this.store.set('timerStates', {})
    }
    if (!this.store.has('stats')) {
      this.store.set('stats', createEmptyStats())
    }
    if (!this.store.has('statsHistory')) {
      this.store.set('statsHistory', [])
    }
    if (!this.store.has('timerStatsHistory')) {
      this.store.set('timerStatsHistory', [])
    }
    if (!this.store.has('lifetimeStats')) {
      this.store.set('lifetimeStats', createEmptyStats())
    }
    if (!this.store.has('settings')) {
      this.store.set('settings', {
        theme: DEFAULT_THEME,
        defaultAlertCues: [],
        defaultAlertVolume: 80,
        defaultMascotAnimationCues: [
          { id: 'default-mascot-50', thresholdPercent: 50, animation: 'wiggle' },
        ],
        alwaysOnTop: false,
        compactMode: false,
        minimizeToTray: true,
        defaultContinueFromLastTime: false,
        defaultContinueWhileAppClosed: false,
        mascotSize: 100,
        mascotScale: 0.65,
        mascotPosition: 'top-right',
        enableInspirationMessages: true,
        autoResetStatsSchedule: 'never',
        defaultGenericMode: 'countdown',
        defaultSitStandMode: 'countdown',
        defaultPomodoroMode: 'countdown',
        serverPort: 5173,
      })
    }
  }

  // Timers
  getTimers(): TimerConfig[] {
    return this.store.get('timers', [])
  }

  addTimer(timer: TimerConfig): void {
    const timers = this.getTimers()
    timers.push(timer)
    this.store.set('timers', timers)
  }

  updateTimer(id: string, updates: Partial<TimerConfig>): void {
    const timers = this.getTimers()
    const index = timers.findIndex((t) => t.id === id)
    if (index !== -1) {
      timers[index] = { ...timers[index], ...updates }
      this.store.set('timers', timers)
    }
  }

  deleteTimer(id: string): void {
    const timers = this.getTimers().filter((t) => t.id !== id)
    this.store.set('timers', timers)
  }

  // Timer states
  getTimerState(id: string): TimerState | undefined {
    const states = this.store.get('timerStates', {})
    return states[id]
  }

  getTimerStates(): Record<string, TimerState> {
    return this.store.get('timerStates', {})
  }

  setTimerState(id: string, state: TimerState): void {
    const states = this.store.get('timerStates', {})
    states[id] = state
    this.store.set('timerStates', states)
  }

  deleteTimerState(id: string): void {
    const states = this.store.get('timerStates', {})
    delete states[id]
    this.store.set('timerStates', states)
  }

  // Stats
  getStats(): GlobalStats {
    return this.store.get('stats', createEmptyStats())
  }

  setStats(stats: GlobalStats): void {
    this.store.set('stats', stats)
  }

  updateStats(updates: Partial<GlobalStats>): void {
    const stats = this.getStats()
    this.store.set('stats', { ...stats, ...updates })
  }

  resetStats(categories: string[] = ['all']): void {
    const stats = this.getStats()
    const resetStats = { ...stats }

    if (categories.includes('all')) {
      resetStats.sitTime = 0
      resetStats.standTime = 0
      resetStats.pomodoroWorkTime = 0
      resetStats.pomodoroBreakTime = 0
      resetStats.genericTimerTime = 0
    } else {
      if (categories.includes('sit')) resetStats.sitTime = 0
      if (categories.includes('stand')) resetStats.standTime = 0
      if (categories.includes('pomodoro-work')) resetStats.pomodoroWorkTime = 0
      if (categories.includes('pomodoro-break')) resetStats.pomodoroBreakTime = 0
      if (categories.includes('generic')) resetStats.genericTimerTime = 0
    }

    resetStats.lastResetAt = Date.now()
    this.store.set('stats', resetStats)
  }

  // Lifetime stats
  getLifetimeStats(): GlobalStats {
    return this.store.get('lifetimeStats', createEmptyStats())
  }

  setLifetimeStats(stats: GlobalStats): void {
    this.store.set('lifetimeStats', stats)
  }

  updateLifetimeStats(updates: Partial<GlobalStats>): void {
    const stats = this.getLifetimeStats()
    this.store.set('lifetimeStats', { ...stats, ...updates })
  }

  resetLifetimeStats(categories: string[] = ['all']): void {
    const stats = this.getLifetimeStats()
    const resetStats = { ...stats }

    if (categories.includes('all')) {
      resetStats.sitTime = 0
      resetStats.standTime = 0
      resetStats.pomodoroWorkTime = 0
      resetStats.pomodoroBreakTime = 0
      resetStats.genericTimerTime = 0
    } else {
      if (categories.includes('sit')) resetStats.sitTime = 0
      if (categories.includes('stand')) resetStats.standTime = 0
      if (categories.includes('pomodoro-work')) resetStats.pomodoroWorkTime = 0
      if (categories.includes('pomodoro-break')) resetStats.pomodoroBreakTime = 0
      if (categories.includes('generic')) resetStats.genericTimerTime = 0
    }

    resetStats.lastResetAt = Date.now()
    this.store.set('lifetimeStats', resetStats)
  }

  // Stats history
  getStatsHistory(): StatsHistory[] {
    return this.store.get('statsHistory', [])
  }

  setStatsHistory(history: StatsHistory[]): void {
    this.store.set('statsHistory', history)
  }

  addStatsHistoryEntry(entry: StatsHistory): void {
    const history = this.getStatsHistory()
    history.push(entry)
    this.store.set('statsHistory', history)
  }

  getTimerStatsHistory(): TimerStatsHistoryEntry[] {
    return this.store.get('timerStatsHistory', [])
  }

  setTimerStatsHistory(history: TimerStatsHistoryEntry[]): void {
    this.store.set('timerStatsHistory', history)
  }

  // Settings
  getSettings(): AppSettings {
    return this.store.get('settings', {
      theme: DEFAULT_THEME,
      defaultAlertCues: [],
      defaultAlertVolume: 80,
      defaultMascotAnimationCues: [
        { id: 'default-mascot-50', thresholdPercent: 50, animation: 'wiggle' },
      ],
      alwaysOnTop: false,
      compactMode: false,
      minimizeToTray: true,
      defaultContinueFromLastTime: false,
      defaultContinueWhileAppClosed: false,
      mascotSize: 100,
      mascotScale: 0.65,
      mascotPosition: 'top-right',
      enableInspirationMessages: true,
      autoResetStatsSchedule: 'never',
      defaultGenericMode: 'countdown',
      defaultSitStandMode: 'countdown',
      defaultPomodoroMode: 'countdown',
      serverPort: 5173,
    })
  }

  updateSettings(updates: Partial<AppSettings>): void {
    const settings = this.getSettings()
    this.store.set('settings', { ...settings, ...updates })
  }

  // Utility
  clear(): void {
    this.store.clear()
  }

  // Get all data (for debugging/export)
  getAllData(): StoredData {
    return {
      timers: this.getTimers(),
      timerStates: this.getTimerStates(),
      stats: this.getStats(),
      statsHistory: this.getStatsHistory(),
      timerStatsHistory: this.getTimerStatsHistory(),
      lifetimeStats: this.getLifetimeStats(),
      settings: this.getSettings(),
    }
  }
}

export default DataStore
