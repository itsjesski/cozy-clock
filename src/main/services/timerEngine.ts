/**
 * Timer tick engine - runs in main process
 * Manages all active timers and broadcasts state changes to renderer via IPC
 */

import { BrowserWindow } from 'electron'
import DataStore from './store'
import { createTimer } from './timers/factory'
import { recordCompletedCycle } from './statsService'
import * as ipc from '../shared/ipc'
import type { TimerState, TimerConfig, AlertCue, MascotAnimationCue } from '../types'
import type { AppSettings } from '../types'
import type { BaseTimer } from './timers/BaseTimer'

const store = new DataStore()
let tickInterval: NodeJS.Timeout | null = null
const activeTimers = new Map<string, BaseTimer>()
const firedAlertThresholds = new Map<string, Set<number>>()
const firedMascotThresholds = new Map<string, Set<number>>()
const lastRemainingPercent = new Map<string, number>()
const lastPersistedStateAt = new Map<string, number>()
const lastRendererEmitAt = new Map<string, number>()
let lastTickTime = Date.now()
let settingsCache: AppSettings | null = null
let settingsCacheAt = 0

const TICK_INTERVAL = 100 // Update every 100ms for smooth animations
const STATE_PERSIST_INTERVAL_MS = 1000
const RENDER_TICK_INTERVAL_MS = 250
const SETTINGS_CACHE_TTL_MS = 1000

function getCachedSettings(): AppSettings {
  const now = Date.now()
  if (!settingsCache || now - settingsCacheAt > SETTINGS_CACHE_TTL_MS) {
    settingsCache = store.getSettings()
    settingsCacheAt = now
  }

  return settingsCache
}

function getResolvedContinuity(config: TimerConfig): {
  continueFromLastTime: boolean
  continueWhileAppClosed: boolean
} {
  const settings = getCachedSettings()
  return {
    continueFromLastTime:
      config.continueFromLastTime ?? settings.defaultContinueFromLastTime ?? false,
    continueWhileAppClosed:
      config.continueWhileAppClosed ?? settings.defaultContinueWhileAppClosed ?? false,
  }
}

function getResolvedPhaseLabel(config: TimerConfig, phaseLabel?: string): string {
  if (config.type === 'sit-stand') {
    return phaseLabel === 'Standing' ? 'Standing' : 'Sitting'
  }

  if (config.type === 'pomodoro') {
    if (phaseLabel === 'Short Break' || phaseLabel === 'Long Break') {
      return phaseLabel
    }

    return 'Work'
  }

  return config.mode === 'countup' ? 'Counting Up' : 'Countdown'
}

function getPhaseTotalSecondsFromConfig(config: TimerConfig, phaseLabel?: string): number {
  const resolvedPhaseLabel = getResolvedPhaseLabel(config, phaseLabel)

  if (config.type === 'sit-stand') {
    return resolvedPhaseLabel === 'Standing'
      ? (config.standDuration || 5 * 60)
      : (config.sitDuration || 25 * 60)
  }

  if (config.type === 'pomodoro') {
    if (resolvedPhaseLabel === 'Work') return config.workDuration || 25 * 60
    if (resolvedPhaseLabel === 'Long Break') return config.longBreakDuration || 15 * 60
    return config.shortBreakDuration || 5 * 60
  }

  return config.duration || 10 * 60
}

function isCurrentPhaseComplete(timer: BaseTimer): boolean {
  const target = getCurrentPhaseTotalSeconds(timer)
  if (target <= 0) return false

  if (timer.config.mode === 'countup') {
    return timer.state.timeElapsed >= target
  }

  return timer.state.timeRemaining <= 0
}

function shouldRefreshStateForConfigUpdate(updates: Partial<TimerConfig>): boolean {
  return [
    'mode',
    'duration',
    'sitDuration',
    'standDuration',
    'workDuration',
    'shortBreakDuration',
    'longBreakDuration',
  ].some((key) => key in updates)
}

function didTimingValuesChange(
  previousConfig: TimerConfig,
  updates: Partial<TimerConfig>,
  nextConfig: TimerConfig,
): boolean {
  const timingKeys: Array<keyof TimerConfig> = [
    'mode',
    'duration',
    'sitDuration',
    'standDuration',
    'workDuration',
    'shortBreakDuration',
    'longBreakDuration',
  ]

  return timingKeys.some((key) => key in updates && previousConfig[key] !== nextConfig[key])
}

function buildStateForUpdatedConfig(config: TimerConfig, previousState?: TimerState): TimerState {
  const phaseLabel = getResolvedPhaseLabel(config, previousState?.currentPhaseLabel)

  return {
    id: config.id,
    phase: previousState?.phase || 'idle',
    timeElapsed: 0,
    timeRemaining: config.mode === 'countup' ? 0 : getPhaseTotalSecondsFromConfig(config, phaseLabel),
    currentPhaseLabel: phaseLabel,
    lastUpdatedAt: Date.now(),
  }
}

function hydrateTimerFromSavedState(timer: BaseTimer, savedState: TimerState): void {
  timer.state = { ...savedState }

  if (timer.config.type === 'sit-stand') {
    const sitStandTimer = timer as unknown as { currentPhase: 'sitting' | 'standing' }
    sitStandTimer.currentPhase = savedState.currentPhaseLabel === 'Standing' ? 'standing' : 'sitting'
    return
  }

  if (timer.config.type === 'pomodoro') {
    const pomodoroTimer = timer as unknown as {
      currentPhase: 'work' | 'short-break' | 'long-break'
    }

    if (savedState.currentPhaseLabel === 'Short Break') {
      pomodoroTimer.currentPhase = 'short-break'
    } else if (savedState.currentPhaseLabel === 'Long Break') {
      pomodoroTimer.currentPhase = 'long-break'
    } else {
      pomodoroTimer.currentPhase = 'work'
    }
  }
}

/**
 * Start the timer engine
 */
export function startTimerEngine(): void {
  if (tickInterval) return

  lastTickTime = Date.now()
  tickInterval = setInterval(() => {
    updateRunningTimers()
  }, TICK_INTERVAL)
}

/**
 * Stop the timer engine
 */
export function stopTimerEngine(): void {
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}

/**
 * Update all running timers
 */
function updateRunningTimers(): void {
  if (activeTimers.size === 0) return

  const now = Date.now()
  const deltaTime = now - lastTickTime
  lastTickTime = now

  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (!mainWindow) return
  const isWindowVisible = mainWindow.isVisible()

  activeTimers.forEach((timer, timerId) => {
    if (timer.state.phase !== 'running') return

    // Tick the timer
    timer.tick(deltaTime)

    emitThresholdAlerts(timerId, timer, mainWindow)

    const lastPersisted = lastPersistedStateAt.get(timerId) ?? 0
    if (now - lastPersisted >= STATE_PERSIST_INTERVAL_MS) {
      store.setTimerState(timerId, timer.getState())
      lastPersistedStateAt.set(timerId, now)
    }

    const lastRendered = lastRendererEmitAt.get(timerId) ?? 0
    const shouldEmitRendererTick = now - lastRendered >= RENDER_TICK_INTERVAL_MS

    if (isWindowVisible && shouldEmitRendererTick) {
      mainWindow.webContents.send(ipc.IPC_TIMER_TICK, {
        id: timerId,
        timeElapsed: timer.state.timeElapsed,
        timeRemaining: timer.state.timeRemaining,
        phase: 'running',
        currentPhaseLabel: timer.getPhaseLabel(),
      })
      lastRendererEmitAt.set(timerId, now)
    }

    // Check if timer is complete
    if (isCurrentPhaseComplete(timer)) {
      handleTimerComplete(timerId, timer, mainWindow)
    }
  })
}

function getCurrentPhaseTotalSeconds(timer: BaseTimer): number {
  return getPhaseTotalSecondsFromConfig(timer.config, timer.getPhaseLabel())
}

function getEffectiveAlertCues(config: TimerConfig): AlertCue[] {
  const settings = getCachedSettings()
  const globalCues = settings.defaultAlertCues || []
  const timerCues = config.alertCues || []

  if (config.useGlobalAlertCues === false) {
    return timerCues
  }

  return timerCues.length > 0 ? timerCues : globalCues
}

function getEffectiveMascotAnimationCues(config: TimerConfig): MascotAnimationCue[] {
  const settings = getCachedSettings()
  const globalCues = settings.defaultMascotAnimationCues || []
  const timerCues = config.mascotAnimationCues || []

  if (config.useGlobalMascotAnimationCues === false) {
    return timerCues
  }

  return timerCues.length > 0 ? timerCues : globalCues
}

function emitThresholdAlerts(timerId: string, timer: BaseTimer, mainWindow: BrowserWindow): void {
  const config = timer.config
  const total = getCurrentPhaseTotalSeconds(timer)
  if (total <= 0 || config.mode === 'countup') return

  const remainingPercent = Math.max(0, Math.min(100, (timer.state.timeRemaining / total) * 100))
  const previousPercent = lastRemainingPercent.get(timerId)
  const firedSet = firedAlertThresholds.get(timerId) || new Set<number>()
  const mascotFiredSet = firedMascotThresholds.get(timerId) || new Set<number>()

  if (previousPercent !== undefined && remainingPercent > previousPercent + 1) {
    firedSet.clear()
    mascotFiredSet.clear()
  }

  const cues = getEffectiveAlertCues(config)
  const volume = config.alertVolume ?? getCachedSettings().defaultAlertVolume ?? 80

  cues.forEach((cue) => {
    const threshold = cue.thresholdPercent
    if (remainingPercent <= threshold && !firedSet.has(threshold) && cue.soundPath.trim()) {
      mainWindow.webContents.send(ipc.IPC_TIMER_ALERT, {
        id: timerId,
        event: `percent-${threshold}`,
        soundPath: cue.soundPath,
        volume,
      })
      firedSet.add(threshold)
    }
  })

  const mascotCues = getEffectiveMascotAnimationCues(config)
  mascotCues.forEach((cue) => {
    const threshold = cue.thresholdPercent
    if (remainingPercent <= threshold && !mascotFiredSet.has(threshold)) {
      mainWindow.webContents.send(ipc.IPC_MASCOT_ANIMATE, {
        id: timerId,
        thresholdPercent: threshold,
        animation: cue.animation,
      })
      mascotFiredSet.add(threshold)
    }
  })

  firedAlertThresholds.set(timerId, firedSet)
  firedMascotThresholds.set(timerId, mascotFiredSet)
  lastRemainingPercent.set(timerId, remainingPercent)
}

/**
 * Handle timer completion
 */
function handleTimerComplete(
  timerId: string,
  timer: BaseTimer,
  mainWindow: BrowserWindow,
): void {
  const completedPhaseLabel = timer.getPhaseLabel()
  const completedConfig = timer.config
  const completion = timer.handleCompletion()
  const statsOverview = recordCompletedCycle(completedConfig, completedPhaseLabel)

  mainWindow.webContents.send(ipc.IPC_STATS_UPDATE, statsOverview)

  if (completion.isComplete) {
    // Timer is fully done
    pauseTimer(timerId)

    // Play alert sound if configured
    const config = store.getTimers().find((t) => t.id === timerId)
    if (config?.alertSounds?.['timer-end']) {
      mainWindow.webContents.send(ipc.IPC_TIMER_ALERT, {
        id: timerId,
        event: 'timer-end',
        soundPath: config.alertSounds['timer-end'],
        volume: config.alertVolume || 80,
      })
    }
  } else {
    // Timer transitioned to next phase
    // Send phase change alert
    const config = store.getTimers().find((t) => t.id === timerId)
    const eventKey = config?.type === 'sit-stand'
      ? timer.state.currentPhaseLabel === 'Standing'
        ? 'stand-start'
        : 'sit-start'
      : 'phase-change'

    if (config?.alertSounds?.[eventKey]) {
      mainWindow.webContents.send(ipc.IPC_TIMER_ALERT, {
        id: timerId,
        event: eventKey,
        soundPath: config.alertSounds[eventKey],
        volume: config.alertVolume || 80,
      })
    }
  }

  // Update state and send to renderer
  const state = timer.getState()
  store.setTimerState(timerId, state)
  mainWindow.webContents.send(ipc.IPC_TIMER_STATE_UPDATE, {
    states: { [timerId]: state },
  })
}

/**
 * Create and load a timer
 */
export function createAndLoadTimer(config: TimerConfig): BaseTimer {
  const timer = createTimer(config)
  store.addTimer(config)
  store.setTimerState(config.id, timer.getState())
  return timer
}

/**
 * Load existing timer from store
 */
export function loadTimer(config: TimerConfig, savedState?: TimerState): BaseTimer {
  const timer = createTimer(config)
  const continuity = getResolvedContinuity(config)

  if (savedState && (continuity.continueFromLastTime || continuity.continueWhileAppClosed)) {
    hydrateTimerFromSavedState(timer, savedState)
  }

  return timer
}

/**
 * Start a timer
 */
export function startTimer(id: string): void {
  let timer = activeTimers.get(id)

  if (!timer) {
    const config = store.getTimers().find((t) => t.id === id)
    if (!config) return

    const savedState = store.getTimerState(id)
    timer = loadTimer(config, savedState)
    activeTimers.set(id, timer)
  }

  timer.start()
  firedAlertThresholds.delete(id)
  firedMascotThresholds.delete(id)
  lastRemainingPercent.delete(id)
  lastPersistedStateAt.set(id, Date.now())
  lastRendererEmitAt.set(id, 0)
  store.setTimerState(id, timer.getState())
  startTimerEngine()
}

/**
 * Pause a timer
 */
export function pauseTimer(id: string): void {
  const timer = activeTimers.get(id)

  if (timer) {
    timer.pause()
    store.setTimerState(id, timer.getState())
    lastPersistedStateAt.set(id, Date.now())
    lastRendererEmitAt.delete(id)
  }

  if (Array.from(activeTimers.values()).every((t) => t.state.phase !== 'running')) {
    stopTimerEngine()
  }
}

/**
 * Resume a timer
 */
export function resumeTimer(id: string): void {
  let timer = activeTimers.get(id)

  if (!timer) {
    const config = store.getTimers().find((t) => t.id === id)
    if (!config) return

    const savedState = store.getTimerState(id)
    timer = loadTimer(config, savedState)
    activeTimers.set(id, timer)
  }

  timer.resume()
  lastPersistedStateAt.set(id, Date.now())
  lastRendererEmitAt.set(id, 0)
  store.setTimerState(id, timer.getState())
  startTimerEngine()
}

/**
 * Reset a timer
 */
export function resetTimer(id: string): void {
  const timer = activeTimers.get(id)

  if (timer) {
    timer.reset()
    firedAlertThresholds.delete(id)
    firedMascotThresholds.delete(id)
    lastRemainingPercent.delete(id)
    lastPersistedStateAt.set(id, Date.now())
    lastRendererEmitAt.delete(id)
    store.setTimerState(id, timer.getState())
  }

  if (Array.from(activeTimers.values()).every((t) => t.state.phase !== 'running')) {
    stopTimerEngine()
  }
}

/**
 * Delete a timer
 */
export function deleteTimer(id: string): void {
  activeTimers.delete(id)
  firedAlertThresholds.delete(id)
  firedMascotThresholds.delete(id)
  lastRemainingPercent.delete(id)
  lastPersistedStateAt.delete(id)
  lastRendererEmitAt.delete(id)
  store.deleteTimer(id)
  store.deleteTimerState(id)

  if (activeTimers.size === 0) {
    stopTimerEngine()
  }
}

export function updateTimerConfig(id: string, updates: Partial<TimerConfig>): void {
  const existingConfig = store.getTimers().find((timer) => timer.id === id)
  if (!existingConfig) return

  const nextConfig = { ...existingConfig, ...updates }
  const hasTimingChange =
    shouldRefreshStateForConfigUpdate(updates) &&
    didTimingValuesChange(existingConfig, updates, nextConfig)
  store.updateTimer(id, updates)

  const active = activeTimers.get(id)
  if (active) {
    active.config = nextConfig

    if (hasTimingChange) {
      active.state = buildStateForUpdatedConfig(nextConfig, active.state)
      store.setTimerState(id, active.getState())
    }

    return
  }

  if (hasTimingChange) {
    const previousState = store.getTimerState(id)
    store.setTimerState(id, buildStateForUpdatedConfig(nextConfig, previousState))
  }
}

/**
 * Initialize timers on app startup (for continuity)
 */
export function initializeTimersFromStore(): void {
  const timerConfigs = store.getTimers()

  timerConfigs.forEach((config) => {
    const savedState = store.getTimerState(config.id)
    const continuity = getResolvedContinuity(config)

    if (savedState && (continuity.continueFromLastTime || continuity.continueWhileAppClosed)) {
      let timer = loadTimer(config, savedState)

      // If continueWhileAppClosed, fast-forward the timer based on elapsed real-world time
      if (continuity.continueWhileAppClosed && savedState.phase === 'running') {
        const timeSinceLastUpdate = (Date.now() - savedState.lastUpdatedAt) / 1000
        timer.state.timeElapsed += timeSinceLastUpdate
        if (config.mode === 'countup') {
          timer.state.timeRemaining += timeSinceLastUpdate
        } else {
          timer.state.timeRemaining = Math.max(0, timer.state.timeRemaining - timeSinceLastUpdate)
        }

        // Check if timer completed while app was closed
        if (isCurrentPhaseComplete(timer)) {
          timer.state.phase = 'paused'
          timer.state.timeRemaining = config.mode === 'countup'
            ? getCurrentPhaseTotalSeconds(timer)
            : 0
        }
      }

      activeTimers.set(config.id, timer)
      lastPersistedStateAt.set(config.id, Date.now())
      lastRendererEmitAt.set(config.id, 0)
    }
  })
}

export function getStoredTimerStatesForConfiguredTimers(): Record<string, TimerState> {
  const states: Record<string, TimerState> = {}

  store.getTimers().forEach((config) => {
    const continuity = getResolvedContinuity(config)
    if (!(continuity.continueFromLastTime || continuity.continueWhileAppClosed)) {
      return
    }

    const savedState = store.getTimerState(config.id)
    if (!savedState) return

    const hydratedTimer = loadTimer(config, savedState)
    states[config.id] = hydratedTimer.getState()
  })

  return states
}

/**
 * Get all active timer states
 */
export function getAllTimerStates(): Record<string, TimerState> {
  const states: Record<string, TimerState> = {}

  activeTimers.forEach((timer, id) => {
    states[id] = timer.getState()
  })

  return states
}

/**
 * Get a specific timer state
 */
export function getTimerState(id: string): TimerState | null {
  const timer = activeTimers.get(id)
  if (timer) {
    return timer.getState()
  }

  return store.getTimerState(id) || null
}
