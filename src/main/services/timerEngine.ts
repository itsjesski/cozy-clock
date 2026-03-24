/**
 * Timer tick engine - runs in main process
 * Manages all active timers and broadcasts state changes to renderer via IPC
 */

import { BrowserWindow, Notification, nativeImage } from 'electron'
import DataStore from '../store'
import { createTimer } from '../timers/factory'
import { getStatsOverview, recordElapsedTime, removeTimerStats } from './statsService'
import * as ipc from '../../shared/ipc'
import { DEFAULT_ALERT_VOLUME } from '../../shared/constants'
import { getPhaseTotalSeconds, getResolvedPhaseLabel } from '../../shared/timerPhase'
import { resolveWindowIconPath } from '../windows/assetPaths'
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
const lastRenderedSecond = new Map<string, number>()
const lastRecordedElapsedSeconds = new Map<string, number>()
const pendingElapsedSeconds = new Map<string, number>()
const lastStatsFlushAt = new Map<string, number>()
const lastStatsBroadcastAt = new Map<string, number>()
const attentionIntervals = new Map<number, NodeJS.Timeout>()
let lastTickTime = Date.now()
let isPrimaryWindowMoving = false
let settingsCache: AppSettings | null = null
let settingsCacheAt = 0

const TICK_INTERVAL = 100 // Update every 100ms for smooth animations
const STATE_PERSIST_INTERVAL_MS = 5000
const STATS_FLUSH_INTERVAL_MS = 5000
const SETTINGS_CACHE_TTL_MS = 1000
const TASKBAR_BLINK_INTERVAL_MS = 700

function getWholeElapsedSeconds(value: number | undefined): number {
  return Math.max(0, Math.floor(value || 0))
}

function clearThresholdTracking(id: string): void {
  firedAlertThresholds.delete(id)
  firedMascotThresholds.delete(id)
  lastRemainingPercent.delete(id)
}

function clearRendererTracking(id: string): void {
  lastRenderedSecond.delete(id)
}

function clearStatsTracking(id: string): void {
  pendingElapsedSeconds.delete(id)
  lastStatsFlushAt.delete(id)
  lastStatsBroadcastAt.delete(id)
}

function flushRunningTimers(now: number): void {
  activeTimers.forEach((timer, timerId) => {
    if (timer.state.phase !== 'running') {
      return
    }

    syncAccumulatedStats(timerId, timer, now, true)
    store.setTimerState(timerId, timer.getState())
    lastPersistedStateAt.set(timerId, now)
  })
}

export function setPrimaryWindowMoving(isMoving: boolean): void {
  if (isPrimaryWindowMoving === isMoving) {
    return
  }

  isPrimaryWindowMoving = isMoving
  if (!isPrimaryWindowMoving) {
    flushRunningTimers(Date.now())
  }
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

function getRenderedRemainingSecond(timer: BaseTimer): number {
  return Math.max(0, Math.ceil(timer.state.timeRemaining || 0))
}

function shouldEmitRendererTick(timerId: string, timer: BaseTimer): boolean {
  const renderedSecond = getRenderedRemainingSecond(timer)
  const previousSecond = lastRenderedSecond.get(timerId)

  if (previousSecond === renderedSecond) {
    return false
  }

  lastRenderedSecond.set(timerId, renderedSecond)
  return true
}

function requestWindowAttention(mainWindow: BrowserWindow): void {
  if (mainWindow.isDestroyed() || mainWindow.isFocused()) {
    return
  }

  const existingInterval = attentionIntervals.get(mainWindow.id)
  if (existingInterval) {
    return
  }

  mainWindow.flashFrame(true)

  const interval = setInterval(() => {
    if (mainWindow.isDestroyed() || mainWindow.isFocused()) {
      clearWindowAttention(mainWindow)
      return
    }

    mainWindow.flashFrame(false)
    mainWindow.flashFrame(true)
  }, TASKBAR_BLINK_INTERVAL_MS)

  attentionIntervals.set(mainWindow.id, interval)
}

export function clearWindowAttention(mainWindow: BrowserWindow): void {
  const interval = attentionIntervals.get(mainWindow.id)
  if (interval) {
    clearInterval(interval)
    attentionIntervals.delete(mainWindow.id)
  }

  if (!mainWindow.isDestroyed()) {
    mainWindow.flashFrame(false)
  }
}

function shouldShowTimerNotification(config: TimerConfig): boolean {
  return config.showTimerNotifications ?? getCachedSettings().defaultShowTimerNotifications ?? true
}

function shouldFlashTaskbar(config: TimerConfig): boolean {
  return config.flashTaskbar ?? getCachedSettings().defaultFlashTaskbar ?? true
}

function showTimerEndNotification(
  mainWindow: BrowserWindow,
  timer: BaseTimer,
  config: TimerConfig,
  isComplete: boolean,
): void {
  if (!Notification.isSupported() || !shouldShowTimerNotification(config)) {
    return
  }

  const label = config.label?.trim() || 'Timer'
  const nextPhaseLabel = timer.getPhaseLabel()
  const normalizedPhase = nextPhaseLabel.toLowerCase()

  const title = isComplete
    ? `${label} is complete 🎉`
    : config.type === 'sit-stand' && normalizedPhase === 'standing'
      ? '🧍 Stand up and stretch!'
      : config.type === 'sit-stand' && normalizedPhase === 'sitting'
        ? '🪑 Take a seat, you\'ve earned it.'
        : config.type === 'pomodoro' && normalizedPhase.includes('break')
          ? '☕ Break time!'
          : config.type === 'pomodoro' && normalizedPhase === 'work'
            ? '🎯 It\'s time to focus!'
            : '🔄 Next phase is ready!'

  const body = isComplete
    ? `Nice work — ${label} is done.`
    : timer.state.phase === 'running'
      ? `${nextPhaseLabel} started. You’ve got this.`
      : `${nextPhaseLabel} is ready when you are.`

  const iconPath = resolveWindowIconPath()
  const notification = new Notification({
    title,
    body,
    silent: true,
    ...(iconPath ? { icon: nativeImage.createFromPath(iconPath) } : {}),
  })

  notification.on('click', () => {
    if (mainWindow.isDestroyed()) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }

    mainWindow.focus()
  })

  notification.show()
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
  if (activeTimers.size === 0) {
    lastTickTime = Date.now()
    return
  }

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

    syncAccumulatedStats(timerId, timer, now)

    emitThresholdAlerts(timerId, timer, mainWindow)

    const lastPersisted = lastPersistedStateAt.get(timerId) ?? 0
    if (!isPrimaryWindowMoving && now - lastPersisted >= STATE_PERSIST_INTERVAL_MS) {
      store.setTimerState(timerId, timer.getState())
      lastPersistedStateAt.set(timerId, now)
    }

    if (isWindowVisible && shouldEmitRendererTick(timerId, timer)) {
      mainWindow.webContents.send(ipc.IPC_TIMER_TICK, {
        id: timerId,
        timeElapsed: timer.state.timeElapsed,
        timeRemaining: timer.state.timeRemaining,
        phase: 'running',
        currentPhaseLabel: timer.getPhaseLabel(),
      })
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

function syncAccumulatedStats(timerId: string, timer: BaseTimer, now: number, forceFlush = false): void {
  const currentWholeElapsed = Math.max(0, Math.floor(timer.state.timeElapsed || 0))
  const lastRecorded = lastRecordedElapsedSeconds.get(timerId) ?? 0
  const delta = currentWholeElapsed - lastRecorded

  if (delta > 0) {
    pendingElapsedSeconds.set(timerId, (pendingElapsedSeconds.get(timerId) ?? 0) + delta)
    lastRecordedElapsedSeconds.set(timerId, currentWholeElapsed)
  }

  const pending = pendingElapsedSeconds.get(timerId) ?? 0
  if (pending <= 0) {
    return
  }

  if (isPrimaryWindowMoving && !forceFlush) {
    return
  }

  const lastFlushed = lastStatsFlushAt.get(timerId) ?? 0
  if (!forceFlush && now - lastFlushed < STATS_FLUSH_INTERVAL_MS) {
    return
  }

  const statsOverview = recordElapsedTime(timer.config, pending, timer.getPhaseLabel())
  pendingElapsedSeconds.delete(timerId)
  lastStatsFlushAt.set(timerId, now)
  lastStatsBroadcastAt.set(timerId, now)

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
  const config = store.getTimers().find((t) => t.id === timerId) ?? timer.config

  if (shouldFlashTaskbar(config)) {
    requestWindowAttention(mainWindow)
  }
  showTimerEndNotification(mainWindow, timer, config, completion.isComplete)

  if (completion.isComplete) {
    // Timer is fully done
    pauseTimer(timerId)

    // Play alert sound if configured
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
  clearStatsTracking(id)
  lastStatsFlushAt.set(id, Date.now())
  clearThresholdTracking(id)
  lastPersistedStateAt.set(id, Date.now())
  clearRendererTracking(id)
  store.setTimerState(id, timer.getState())
  startTimerEngine()
}

export function pauseTimer(id: string): void {
  const timer = activeTimers.get(id)

  if (timer) {
    syncAccumulatedStats(id, timer, Date.now(), true)
    timer.pause()
    store.setTimerState(id, timer.getState())
    lastPersistedStateAt.set(id, Date.now())
    clearRendererTracking(id)
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
  clearStatsTracking(id)
  lastStatsFlushAt.set(id, Date.now())
  lastPersistedStateAt.set(id, Date.now())
  clearRendererTracking(id)
  store.setTimerState(id, timer.getState())
  startTimerEngine()
}

export function resetTimer(id: string): void {
  const timer = activeTimers.get(id)

  if (timer) {
    syncAccumulatedStats(id, timer, Date.now(), true)

    timer.reset()
    lastRecordedElapsedSeconds.set(id, 0)
    clearStatsTracking(id)
    clearThresholdTracking(id)
    lastPersistedStateAt.set(id, Date.now())
    clearRendererTracking(id)
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

  syncAccumulatedStats(id, timer, Date.now(), true)

  const didAdvance = timer.skipToNextPhase()
  if (!didAdvance) {
    return
  }

  lastRecordedElapsedSeconds.set(id, getWholeElapsedSeconds(timer.state.timeElapsed))
  clearThresholdTracking(id)
  lastPersistedStateAt.set(id, Date.now())
  if (timer.state.phase === 'running') {
    clearRendererTracking(id)
    startTimerEngine()
  } else {
    clearRendererTracking(id)
    stopEngineIfNoRunningTimers()
  }

  store.setTimerState(id, timer.getState())
}

export function deleteTimer(id: string): void {
  const activeTimer = activeTimers.get(id)
  if (activeTimer) {
    syncAccumulatedStats(id, activeTimer, Date.now(), true)
  }

  activeTimers.delete(id)
  const statsOverview = removeTimerStats(id)
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(ipc.IPC_STATS_UPDATE, statsOverview)
  })
  clearThresholdTracking(id)
  lastPersistedStateAt.delete(id)
  clearRendererTracking(id)
  clearStatsTracking(id)
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
      clearStatsTracking(config.id)
      lastStatsFlushAt.set(config.id, Date.now())
      lastPersistedStateAt.set(config.id, Date.now())
      clearRendererTracking(config.id)
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
