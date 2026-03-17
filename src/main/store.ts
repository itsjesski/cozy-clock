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
import { createDefaultAppSettings } from '../shared/defaultSettings'

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

  private zeroSelectedStats(stats: GlobalStats, categories: string[]): GlobalStats {
    const next = { ...stats }

    if (categories.includes('all')) {
      next.sitTime = 0
      next.standTime = 0
      next.pomodoroWorkTime = 0
      next.pomodoroBreakTime = 0
      next.genericTimerTime = 0
      return next
    }

    if (categories.includes('sit')) next.sitTime = 0
    if (categories.includes('stand')) next.standTime = 0
    if (categories.includes('pomodoro-work')) next.pomodoroWorkTime = 0
    if (categories.includes('pomodoro-break')) next.pomodoroBreakTime = 0
    if (categories.includes('generic')) next.genericTimerTime = 0
    return next
  }

  private resetStatsPayload(stats: GlobalStats, categories: string[]): GlobalStats {
    const reset = this.zeroSelectedStats(stats, categories)
    reset.lastResetAt = Date.now()
    return reset
  }

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
      this.store.set('settings', createDefaultAppSettings())
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
    this.store.set('stats', this.resetStatsPayload(this.getStats(), categories))
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
    this.store.set('lifetimeStats', this.resetStatsPayload(this.getLifetimeStats(), categories))
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
    return this.store.get('settings', createDefaultAppSettings())
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
