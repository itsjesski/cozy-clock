/**
 * Timer tick engine - runs in main process
 * Manages all active timers and broadcasts state changes to renderer via IPC
 */

import { BrowserWindow } from 'electron'
import DataStore from '../store'
import { createTimer } from '../timers/factory'
import { getStatsOverview, recordElapsedTime, removeTimerStats } from './statsService'
import * as ipc from '../../shared/ipc'
import { DEFAULT_ALERT_VOLUME } from '../../shared/constants'
import { getPhaseTotalSeconds, getResolvedPhaseLabel } from '../../shared/timerPhase'
import type { TimerState, TimerConfig, AlertCue, MascotAnimationCue } from '../../types'
import type { AppSettings } from '../../types'
import type { BaseTimer } from '../timers/BaseTimer'

const store = new DataStore()
let tickInterval: NodeJS.Timeout | null = null
const activeTimers = new Map<string, BaseTimer>()
const firedAlertThresholds = new Map<string, Set<number>>()
const firedMascotThresholds = new Map<string, Set<number>>()
const lastRemainingPercent = new Map<string, number>()
const lastPersistedStateAt = new Map<string, number>()
const lastRendererEmitAt = new Map<string, number>()
const lastRecordedElapsedSeconds = new Map<string, number>()
let lastTickTime = Date.now()
let settingsCache: AppSettings | null = null
let settingsCacheAt = 0

const TICK_INTERVAL = 100 // Update every 100ms for smooth animations
const STATE_PERSIST_INTERVAL_MS = 1000
const RENDER_TICK_INTERVAL_MS = 250
const SETTINGS_CACHE_TTL_MS = 1000

function getWholeElapsedSeconds(value: number | undefined): number {
  return Math.max(0, Math.floor(value || 0))
}

function clearThresholdTracking(id: string): void {
  firedAlertThresholds.delete(id)
  firedMascotThresholds.delete(id)
  lastRemainingPercent.delete(id)
}

function stopEngineIfNoRunningTimers(): void {
  if (Array.from(activeTimers.values()).every((timer) => timer.state.phase !== 'running')) {
    stopTimerEngine()
  }
}

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
  const phaseLabel = getResolvedPhaseLabel(
    config.type,
    config.mode,
    previousState?.currentPhaseLabel,
  )

  return {
    id: config.id,
    phase: previousState?.phase || 'idle',
    timeElapsed: 0,
    timeRemaining: config.mode === 'countup' ? 0 : getPhaseTotalSeconds(config, phaseLabel),
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

export function startTimerEngine(): void {
  if (tickInterval) return

  lastTickTime = Date.now()
  tickInterval = setInterval(() => {
    updateRunningTimers()
  }, TICK_INTERVAL)
}

export function stopTimerEngine(): void {
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}

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

    syncAccumulatedStats(timerId, timer)

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
  return getPhaseTotalSeconds(timer.config, timer.getPhaseLabel())
}

function syncAccumulatedStats(timerId: string, timer: BaseTimer): void {
  const currentWholeElapsed = Math.max(0, Math.floor(timer.state.timeElapsed || 0))
  const lastRecorded = lastRecordedElapsedSeconds.get(timerId) ?? 0
  const delta = currentWholeElapsed - lastRecorded

  if (delta <= 0) {
    return
  }

  const statsOverview = recordElapsedTime(timer.config, delta, timer.getPhaseLabel())
  lastRecordedElapsedSeconds.set(timerId, lastRecorded + delta)

  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(ipc.IPC_STATS_UPDATE, statsOverview)
  })
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
  const completedPercent = 100 - remainingPercent
  const previousPercent = lastRemainingPercent.get(timerId)
  const firedSet = firedAlertThresholds.get(timerId) || new Set<number>()
  const mascotFiredSet = firedMascotThresholds.get(timerId) || new Set<number>()

  if (previousPercent !== undefined && remainingPercent > previousPercent + 1) {
    firedSet.clear()
    mascotFiredSet.clear()
  }

  const cues = getEffectiveAlertCues(config)
  const volume = config.alertVolume ?? getCachedSettings().defaultAlertVolume ?? DEFAULT_ALERT_VOLUME

  cues.forEach((cue) => {
    const threshold = cue.thresholdPercent
    if (completedPercent >= threshold && !firedSet.has(threshold) && cue.soundPath.trim()) {
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
    if (completedPercent >= threshold && !mascotFiredSet.has(threshold)) {
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

function handleTimerComplete(
  timerId: string,
  timer: BaseTimer,
  mainWindow: BrowserWindow,
): void {
  const completion = timer.handleCompletion()
  lastRecordedElapsedSeconds.set(timerId, getWholeElapsedSeconds(timer.state.timeElapsed))

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

export function createAndLoadTimer(config: TimerConfig): BaseTimer {
  const timer = createTimer(config)
  store.addTimer(config)
  store.setTimerState(config.id, timer.getState())
  return timer
}

export function loadTimer(config: TimerConfig, savedState?: TimerState): BaseTimer {
  const timer = createTimer(config)
  const continuity = getResolvedContinuity(config)

  if (savedState && (continuity.continueFromLastTime || continuity.continueWhileAppClosed)) {
    hydrateTimerFromSavedState(timer, savedState)
  }

  return timer
}

function loadTimerFromSavedState(config: TimerConfig, savedState: TimerState): BaseTimer {
  const timer = createTimer(config)
  hydrateTimerFromSavedState(timer, savedState)
  return timer
}

export function startTimer(id: string): void {
  let timer = activeTimers.get(id)

  if (!timer) {
    const config = store.getTimers().find((t) => t.id === id)
    if (!config) return

    const savedState = store.getTimerState(id)
    timer = savedState && savedState.phase !== 'idle'
      ? loadTimerFromSavedState(config, savedState)
      : loadTimer(config, savedState)
    activeTimers.set(id, timer)
  }

  timer.start()
  lastRecordedElapsedSeconds.set(id, getWholeElapsedSeconds(timer.state.timeElapsed))
  clearThresholdTracking(id)
  lastPersistedStateAt.set(id, Date.now())
  lastRendererEmitAt.set(id, 0)
  store.setTimerState(id, timer.getState())
  startTimerEngine()
}

export function pauseTimer(id: string): void {
  const timer = activeTimers.get(id)

  if (timer) {
    syncAccumulatedStats(id, timer)
    timer.pause()
    store.setTimerState(id, timer.getState())
    lastPersistedStateAt.set(id, Date.now())
    lastRendererEmitAt.delete(id)
  }

  stopEngineIfNoRunningTimers()
}

export function resumeTimer(id: string): void {
  let timer = activeTimers.get(id)

  if (!timer) {
    const config = store.getTimers().find((t) => t.id === id)
    if (!config) return

    const savedState = store.getTimerState(id)
    timer = savedState
      ? loadTimerFromSavedState(config, savedState)
      : loadTimer(config, savedState)
    activeTimers.set(id, timer)
  }

  timer.resume()
  lastRecordedElapsedSeconds.set(id, getWholeElapsedSeconds(timer.state.timeElapsed))
  lastPersistedStateAt.set(id, Date.now())
  lastRendererEmitAt.set(id, 0)
  store.setTimerState(id, timer.getState())
  startTimerEngine()
}

export function resetTimer(id: string): void {
  const timer = activeTimers.get(id)

  if (timer) {
    syncAccumulatedStats(id, timer)

    timer.reset()
    lastRecordedElapsedSeconds.set(id, 0)
    clearThresholdTracking(id)
    lastPersistedStateAt.set(id, Date.now())
    lastRendererEmitAt.delete(id)
    store.setTimerState(id, timer.getState())

    const statsOverview = getStatsOverview()
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(ipc.IPC_STATS_UPDATE, statsOverview)
    })
  }

  stopEngineIfNoRunningTimers()
}

export function nextTimerPhase(id: string): void {
  let timer = activeTimers.get(id)

  if (!timer) {
    const config = store.getTimers().find((t) => t.id === id)
    if (!config) return

    const savedState = store.getTimerState(id)
    timer = savedState
      ? loadTimerFromSavedState(config, savedState)
      : loadTimer(config, savedState)
    activeTimers.set(id, timer)
  }

  syncAccumulatedStats(id, timer)

  const didAdvance = timer.skipToNextPhase()
  if (!didAdvance) {
    return
  }

  lastRecordedElapsedSeconds.set(id, getWholeElapsedSeconds(timer.state.timeElapsed))
  clearThresholdTracking(id)
  lastPersistedStateAt.set(id, Date.now())
  if (timer.state.phase === 'running') {
    lastRendererEmitAt.set(id, 0)
    startTimerEngine()
  } else {
    lastRendererEmitAt.delete(id)
    stopEngineIfNoRunningTimers()
  }

  store.setTimerState(id, timer.getState())
}

export function deleteTimer(id: string): void {
  activeTimers.delete(id)
  const statsOverview = removeTimerStats(id)
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(ipc.IPC_STATS_UPDATE, statsOverview)
  })
  clearThresholdTracking(id)
  lastPersistedStateAt.delete(id)
  lastRendererEmitAt.delete(id)
  lastRecordedElapsedSeconds.delete(id)
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
      lastRecordedElapsedSeconds.set(config.id, getWholeElapsedSeconds(timer.state.timeElapsed))
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

export function getAllTimerStates(): Record<string, TimerState> {
  const states: Record<string, TimerState> = {}

  activeTimers.forEach((timer, id) => {
    states[id] = timer.getState()
  })

  return states
}

export function getTimerState(id: string): TimerState | null {
  const timer = activeTimers.get(id)
  if (timer) {
    return timer.getState()
  }

  const stored = store.getTimerState(id)
  if (!stored) return null
  // If the stored phase is 'running' but the engine isn't tracking this timer,
  // the timer is not actually running — normalize to 'paused'.
  return stored.phase === 'running' ? { ...stored, phase: 'paused' } : stored
}
