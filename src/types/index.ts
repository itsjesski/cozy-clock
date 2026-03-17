/**
 * Shared type definitions used across main and renderer processes
 */

export type TimerType = 'sit-stand' | 'pomodoro' | 'generic'

export type TimerMode = 'countdown' | 'countup'

export type TimerPhase = 'idle' | 'running' | 'paused'

export type ClockDisplayMode =
  | 'digital'
  | 'analog'
  | 'ring'
  | 'flip'
  | 'minimal'

export interface AlertCue {
  id: string
  thresholdPercent: number
  soundPath: string
}

export type MascotAnimationType = 'shake' | 'wiggle' | 'bounce'

export interface MascotAnimationCue {
  id: string
  thresholdPercent: number
  animation: MascotAnimationType
}

export interface TimerConfig {
  id: string
  type: TimerType
  label: string
  displayMode: ClockDisplayMode
  mode: TimerMode
  // Generic timer
  duration?: number
  // Sit/Stand timer
  sitDuration?: number
  standDuration?: number
  autoAdvanceStages?: boolean
  autoLoop?: boolean // legacy alias for autoAdvanceStages
  // Pomodoro timer
  workDuration?: number
  shortBreakDuration?: number
  longBreakDuration?: number
  roundsBeforeLongBreak?: number
  // Display & UX
  borderColor?: string
  showInspirationMessages?: boolean
  inspirationThresholds?: number[] // e.g., [75, 50, 25, 10]
  // Sound alerts
  alertSounds?: Record<string, string> // legacy event sounds
  alertCues?: AlertCue[]
  useGlobalAlertCues?: boolean
  alertVolume?: number // 0-100
  // Mascot animations
  mascotAnimationCues?: MascotAnimationCue[]
  useGlobalMascotAnimationCues?: boolean
  // Mascot display overrides
  useGlobalMascotSettings?: boolean
  mascotImagePath?: string
  mascotSize?: number
  mascotScale?: number // 0.3 - 1.2
  mascotPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  // Continuity
  continueFromLastTime?: boolean
  continueWhileAppClosed?: boolean
}

export interface TimerState {
  id: string
  phase: TimerPhase
  timeElapsed: number
  timeRemaining: number
  currentPhaseLabel?: string
  lastUpdatedAt: number
}

export interface GlobalStats {
  sitTime: number // in seconds
  standTime: number
  pomodoroWorkTime: number
  pomodoroBreakTime: number
  genericTimerTime: number
  lastResetAt: number
}

export interface StatsHistory {
  date: string // YYYY-MM-DD
  sitTime: number
  standTime: number
  pomodoroWorkTime: number
  pomodoroBreakTime: number
  genericTimerTime: number
}

export interface TimerStatsHistoryEntry {
  timerId: string
  date: string // YYYY-MM-DD
  totalTime?: number // legacy
  sitTime?: number
  standTime?: number
  pomodoroWorkTime?: number
  pomodoroBreakTime?: number
  genericTimerTime?: number
}

export interface TimerStatsBreakdown {
  totalTime: number
  sitTime: number
  standTime: number
  pomodoroWorkTime: number
  pomodoroBreakTime: number
  genericTimerTime: number
}

export interface TimerPeriodStats {
  day: TimerStatsBreakdown
  week: TimerStatsBreakdown
  month: TimerStatsBreakdown
  year: TimerStatsBreakdown
}

export type StatsPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'lifetime'

export type StatsResetScope = 'current' | 'lifetime'

export interface AppSettings {
  theme: string // theme name
  accentColor?: string
  defaultAlertCues?: AlertCue[]
  defaultAlertVolume?: number
  defaultMascotAnimationCues?: MascotAnimationCue[]
  alwaysOnTop?: boolean
  compactMode?: boolean
  minimizeToTray?: boolean
  defaultContinueFromLastTime?: boolean
  defaultContinueWhileAppClosed?: boolean
  defaultAutoAdvanceStages?: boolean
  mascotImagePath?: string
  mascotSize?: number // 50-200
  mascotScale?: number // 0.3 - 1.2
  mascotPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  enableInspirationMessages?: boolean
  autoResetStatsSchedule?: 'never' | 'daily' | 'weekly' | 'monthly'
  autoResetStatsLastDate?: string
  defaultGenericMode?: TimerMode
  defaultSitStandMode?: TimerMode
  defaultPomodoroMode?: TimerMode
  serverPort?: number
}

export interface StoredData {
  timers: TimerConfig[]
  timerStates: Record<string, TimerState>
  stats: GlobalStats
  statsHistory: StatsHistory[]
  timerStatsHistory: TimerStatsHistoryEntry[]
  lifetimeStats: GlobalStats
  settings: AppSettings
}

// IPC Messages - Main to Renderer

export interface IpcTimerTick {
  id: string
  timeElapsed: number
  timeRemaining: number
  phase: TimerPhase
  currentPhaseLabel?: string
}

export interface IpcTimerAlert {
  id: string
  event: string
  soundPath?: string
  volume?: number
}

export interface IpcUpdateTimerState {
  states: Record<string, TimerState>
}

export interface IpcUpdateStats {
  stats: GlobalStats
  statsHistory: StatsHistory[]
  lifetimeStats: GlobalStats
}

// IPC Messages - Renderer to Main

export interface IpcCreateTimer extends TimerConfig {}

export interface IpcDeleteTimer {
  id: string
}

export interface IpcStartTimer {
  id: string
}

export interface IpcPauseTimer {
  id: string
}

export interface IpcResumeTimer {
  id: string
}

export interface IpcNextTimerPhase {
  id: string
}

export interface IpcResetTimer {
  id: string
}

export interface IpcUpdateSettings {
  settings: Partial<AppSettings>
}

export interface IpcResetStats {
  categories: string[] // 'sit' | 'stand' | 'pomodoro-work' | 'pomodoro-break' | 'generic'
  scope?: StatsResetScope
}

export interface IpcStatsRequest {
  period: StatsPeriod
}

export interface IpcStreamerWindowAction {
  id: string
  action: 'open' | 'close' | 'toggle'
  config?: {
    x?: number
    y?: number
    width?: number
    height?: number
    transparent?: boolean
    chromaKey?: string
  }
}
