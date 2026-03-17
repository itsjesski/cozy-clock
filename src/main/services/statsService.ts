import DataStore from '../store'
import type {
  GlobalStats,
  StatsHistory,
  StatsResetScope,
  TimerConfig,
  StatsPeriod,
  TimerStatsHistoryEntry,
  TimerPeriodStats,
} from '../../types'
import { getDateKey, getTodayDate } from '../../shared/utils'

const store = new DataStore()

type StatsBucketKey = keyof Omit<GlobalStats, 'lastResetAt'>
const STATS_BUCKET_KEYS: StatsBucketKey[] = [
  'sitTime',
  'standTime',
  'pomodoroWorkTime',
  'pomodoroBreakTime',
  'genericTimerTime',
]

function createEmptyTimerBreakdown(): TimerPeriodStats['day'] {
  return {
    totalTime: 0,
    sitTime: 0,
    standTime: 0,
    pomodoroWorkTime: 0,
    pomodoroBreakTime: 0,
    genericTimerTime: 0,
  }
}

function getTimerType(timerId: string): TimerConfig['type'] | undefined {
  return store.getTimers().find((timer) => timer.id === timerId)?.type
}

function normalizeTimerEntry(
  entry: TimerStatsHistoryEntry,
  timerType?: TimerConfig['type'],
): Required<Pick<TimerStatsHistoryEntry, 'timerId' | 'date'>> & TimerPeriodStats['day'] {
  const sitTime = entry.sitTime ?? 0
  const standTime = entry.standTime ?? 0
  const pomodoroWorkTime = entry.pomodoroWorkTime ?? 0
  const pomodoroBreakTime = entry.pomodoroBreakTime ?? 0
  const genericTimerTime = entry.genericTimerTime ?? 0

  const hasCategoryValues =
    sitTime + standTime + pomodoroWorkTime + pomodoroBreakTime + genericTimerTime > 0

  if (hasCategoryValues) {
    return {
      timerId: entry.timerId,
      date: entry.date,
      sitTime,
      standTime,
      pomodoroWorkTime,
      pomodoroBreakTime,
      genericTimerTime,
      totalTime: sitTime + standTime + pomodoroWorkTime + pomodoroBreakTime + genericTimerTime,
    }
  }

  const legacyTotal = entry.totalTime ?? 0
  if (legacyTotal <= 0) {
    return {
      timerId: entry.timerId,
      date: entry.date,
      ...createEmptyTimerBreakdown(),
    }
  }

  if (timerType === 'pomodoro') {
    return {
      timerId: entry.timerId,
      date: entry.date,
      sitTime: 0,
      standTime: 0,
      pomodoroWorkTime: legacyTotal,
      pomodoroBreakTime: 0,
      genericTimerTime: 0,
      totalTime: legacyTotal,
    }
  }

  if (timerType === 'sit-stand') {
    return {
      timerId: entry.timerId,
      date: entry.date,
      sitTime: legacyTotal,
      standTime: 0,
      pomodoroWorkTime: 0,
      pomodoroBreakTime: 0,
      genericTimerTime: 0,
      totalTime: legacyTotal,
    }
  }

  return {
    timerId: entry.timerId,
    date: entry.date,
    sitTime: 0,
    standTime: 0,
    pomodoroWorkTime: 0,
    pomodoroBreakTime: 0,
    genericTimerTime: legacyTotal,
    totalTime: legacyTotal,
  }
}

const CATEGORY_TO_BUCKET: Record<string, StatsBucketKey> = {
  sit: 'sitTime',
  stand: 'standTime',
  'pomodoro-work': 'pomodoroWorkTime',
  'pomodoro-break': 'pomodoroBreakTime',
  generic: 'genericTimerTime',
}

function createEmptyHistoryEntry(date: string): StatsHistory {
  return {
    date,
    sitTime: 0,
    standTime: 0,
    pomodoroWorkTime: 0,
    pomodoroBreakTime: 0,
    genericTimerTime: 0,
  }
}

function mergeStats(base: GlobalStats, updates: Partial<Record<StatsBucketKey, number>>): GlobalStats {
  return applyBucketDeltas(base, updates)
}

function updateHistory(history: StatsHistory[], date: string, updates: Partial<Record<StatsBucketKey, number>>): StatsHistory[] {
  const nextHistory = [...history]
  const existingIndex = nextHistory.findIndex((entry) => entry.date === date)
  const base = existingIndex >= 0 ? nextHistory[existingIndex] : createEmptyHistoryEntry(date)
  const nextEntry: StatsHistory = applyBucketDeltas(base, updates)

  if (existingIndex >= 0) {
    nextHistory[existingIndex] = nextEntry
  } else {
    nextHistory.push(nextEntry)
  }

  return nextHistory.sort((a, b) => a.date.localeCompare(b.date))
}

function getWeekStart(date: Date): Date {
  const next = new Date(date)
  const day = next.getDay()
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() - day)
  return next
}

function isAutoResetDue(schedule: string | undefined, lastDate: string | undefined, now: Date): boolean {
  if (!schedule || schedule === 'never') return false
  if (!lastDate) return true

  const last = new Date(`${lastDate}T00:00:00`)
  if (Number.isNaN(last.getTime())) return true

  if (schedule === 'daily') {
    return getTodayDate() !== lastDate
  }

  if (schedule === 'weekly') {
    return getWeekStart(now).getTime() !== getWeekStart(last).getTime()
  }

  return now.getFullYear() !== last.getFullYear() || now.getMonth() !== last.getMonth()
}

function getCompletedCycleIncrement(config: TimerConfig, phaseLabel?: string): Partial<Record<StatsBucketKey, number>> {
  if (config.type === 'sit-stand') {
    const isStanding = phaseLabel === 'Standing'
    return isStanding
      ? { standTime: config.standDuration ?? 5 * 60 }
      : { sitTime: config.sitDuration ?? 25 * 60 }
  }

  if (config.type === 'pomodoro') {
    if (phaseLabel === 'Long Break') {
      return { pomodoroBreakTime: config.longBreakDuration ?? 15 * 60 }
    }
    if (phaseLabel === 'Short Break') {
      return { pomodoroBreakTime: config.shortBreakDuration ?? 5 * 60 }
    }
    return { pomodoroWorkTime: config.workDuration ?? 25 * 60 }
  }

  if (config.mode === 'countup') {
    return {}
  }

  return { genericTimerTime: config.duration ?? 10 * 60 }
}

function getIncrementTotalSeconds(increment: Partial<Record<StatsBucketKey, number>>): number {
  return sumBucketValues(increment as Record<StatsBucketKey, number>)
}

function updateTimerHistory(
  history: TimerStatsHistoryEntry[],
  timerId: string,
  date: string,
  increment: Partial<Record<StatsBucketKey, number>>,
): TimerStatsHistoryEntry[] {
  const nextHistory = [...history]
  const timerType = getTimerType(timerId)
  const existingIndex = nextHistory.findIndex(
    (entry) => entry.timerId === timerId && entry.date === date,
  )

  const base =
    existingIndex >= 0
      ? normalizeTimerEntry(nextHistory[existingIndex], timerType)
      : { timerId, date, ...createEmptyTimerBreakdown() }
  const nextBreakdown = applyBucketDeltas(base, increment)

  const nextEntry: TimerStatsHistoryEntry = {
    ...nextBreakdown,
    totalTime: sumBucketValues(nextBreakdown),
  }

  if (existingIndex >= 0) {
    nextHistory[existingIndex] = nextEntry
  } else {
    nextHistory.push(nextEntry)
  }

  return nextHistory.sort((a, b) => a.date.localeCompare(b.date))
}

function getStartOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function filterTimerEntriesByDays(
  entries: TimerStatsHistoryEntry[],
  now: Date,
  days: number,
): TimerStatsHistoryEntry[] {
  const start = getStartOfDay(now)
  start.setDate(start.getDate() - (days - 1))
  return entries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`)
    return entryDate >= start && entryDate <= now
  })
}

function sumTimerEntries(
  entries: TimerStatsHistoryEntry[],
  timerType?: TimerConfig['type'],
): TimerPeriodStats['day'] {
  return entries.reduce<TimerPeriodStats['day']>((acc, entry) => {
    const normalized = normalizeTimerEntry(entry, timerType)
    const next = applyBucketDeltas(acc, normalized)
    return {
      ...next,
      totalTime: sumBucketValues(next),
    }
  }, createEmptyTimerBreakdown())
}

export function ensureAutoResetStats(): void {
  const settings = store.getSettings()
  const now = new Date()
  const today = getTodayDate()
  const lastDate = settings.autoResetStatsLastDate

  if (!isAutoResetDue(settings.autoResetStatsSchedule, lastDate, now)) {
    return
  }

  store.resetStats(['all'])
  store.updateSettings({ autoResetStatsLastDate: today })
}

export function getStatsOverview(_period?: StatsPeriod): {
  stats: GlobalStats
  statsHistory: StatsHistory[]
  lifetimeStats: GlobalStats
} {
  ensureAutoResetStats()

  return {
    stats: store.getStats(),
    statsHistory: store.getStatsHistory(),
    lifetimeStats: store.getLifetimeStats(),
  }
}

export function recordCompletedCycle(config: TimerConfig, completedPhaseLabel?: string): {
  stats: GlobalStats
  statsHistory: StatsHistory[]
  lifetimeStats: GlobalStats
} {
  ensureAutoResetStats()

  const increment = getCompletedCycleIncrement(config, completedPhaseLabel)
  if (Object.keys(increment).length === 0) {
    return getStatsOverview()
  }

  const totalSeconds = getIncrementTotalSeconds(increment)
  if (totalSeconds > 0) {
    const updatedTimerHistory = updateTimerHistory(
      store.getTimerStatsHistory(),
      config.id,
      getTodayDate(),
      increment,
    )
    store.setTimerStatsHistory(updatedTimerHistory)
  }

  const currentStats = mergeStats(store.getStats(), increment)
  const lifetimeStats = mergeStats(store.getLifetimeStats(), increment)
  const statsHistory = updateHistory(store.getStatsHistory(), getTodayDate(), increment)

  store.setStats(currentStats)
  store.setLifetimeStats(lifetimeStats)
  store.setStatsHistory(statsHistory)

  return {
    stats: currentStats,
    statsHistory,
    lifetimeStats,
  }
}

export function recordElapsedTime(
  config: TimerConfig,
  elapsedSeconds: number,
  phaseLabel?: string,
): {
  stats: GlobalStats
  statsHistory: StatsHistory[]
  lifetimeStats: GlobalStats
} {
  ensureAutoResetStats()

  const seconds = Math.max(0, elapsedSeconds)
  if (seconds <= 0) {
    return getStatsOverview()
  }

  let increment: Partial<Record<StatsBucketKey, number>> = {}

  if (config.type === 'sit-stand') {
    const isStanding = phaseLabel === 'Standing'
    increment = isStanding
      ? { standTime: seconds }
      : { sitTime: seconds }
  } else if (config.type === 'pomodoro') {
    const isBreakPhase = phaseLabel === 'Short Break' || phaseLabel === 'Long Break'
    increment = isBreakPhase
      ? { pomodoroBreakTime: seconds }
      : { pomodoroWorkTime: seconds }
  } else {
    increment = { genericTimerTime: seconds }
  }

  const updatedTimerHistory = updateTimerHistory(
    store.getTimerStatsHistory(),
    config.id,
    getTodayDate(),
    increment,
  )
  store.setTimerStatsHistory(updatedTimerHistory)

  const currentStats = mergeStats(store.getStats(), increment)
  const lifetimeStats = mergeStats(store.getLifetimeStats(), increment)
  const statsHistory = updateHistory(store.getStatsHistory(), getTodayDate(), increment)

  store.setStats(currentStats)
  store.setLifetimeStats(lifetimeStats)
  store.setStatsHistory(statsHistory)

  return {
    stats: currentStats,
    statsHistory,
    lifetimeStats,
  }
}

export function removeTimerStats(timerId: string): {
  stats: GlobalStats
  statsHistory: StatsHistory[]
  lifetimeStats: GlobalStats
} {
  const timerType = getTimerType(timerId)
  const existingEntries = store.getTimerStatsHistory()
  const removedEntries = existingEntries.filter((entry) => entry.timerId === timerId)

  if (removedEntries.length === 0) {
    return getStatsOverview()
  }

  const totalsToSubtract = removedEntries.reduce<TimerPeriodStats['day']>((acc, entry) => {
    const normalized = normalizeTimerEntry(entry, timerType)
    return {
      totalTime: acc.totalTime + normalized.totalTime,
      sitTime: acc.sitTime + normalized.sitTime,
      standTime: acc.standTime + normalized.standTime,
      pomodoroWorkTime: acc.pomodoroWorkTime + normalized.pomodoroWorkTime,
      pomodoroBreakTime: acc.pomodoroBreakTime + normalized.pomodoroBreakTime,
      genericTimerTime: acc.genericTimerTime + normalized.genericTimerTime,
    }
  }, createEmptyTimerBreakdown())

  const negativeTotals: Partial<Record<StatsBucketKey, number>> = {
    sitTime: -totalsToSubtract.sitTime,
    standTime: -totalsToSubtract.standTime,
    pomodoroWorkTime: -totalsToSubtract.pomodoroWorkTime,
    pomodoroBreakTime: -totalsToSubtract.pomodoroBreakTime,
    genericTimerTime: -totalsToSubtract.genericTimerTime,
  }

  const subtractStats = (base: GlobalStats): GlobalStats =>
    applyBucketDeltas(base, negativeTotals, true)

  const nextStats = subtractStats(store.getStats())
  const nextLifetime = subtractStats(store.getLifetimeStats())
  const nextHistory = store.getStatsHistory().map((entry) => {
    const perDateRemoved = removedEntries
      .filter((timerEntry) => timerEntry.date === entry.date)
      .reduce<TimerPeriodStats['day']>((acc, timerEntry) => {
        const normalized = normalizeTimerEntry(timerEntry, timerType)
        return {
          totalTime: acc.totalTime + normalized.totalTime,
          sitTime: acc.sitTime + normalized.sitTime,
          standTime: acc.standTime + normalized.standTime,
          pomodoroWorkTime: acc.pomodoroWorkTime + normalized.pomodoroWorkTime,
          pomodoroBreakTime: acc.pomodoroBreakTime + normalized.pomodoroBreakTime,
          genericTimerTime: acc.genericTimerTime + normalized.genericTimerTime,
        }
      }, createEmptyTimerBreakdown())

    return applyBucketDeltas(entry, {
      sitTime: -perDateRemoved.sitTime,
      standTime: -perDateRemoved.standTime,
      pomodoroWorkTime: -perDateRemoved.pomodoroWorkTime,
      pomodoroBreakTime: -perDateRemoved.pomodoroBreakTime,
      genericTimerTime: -perDateRemoved.genericTimerTime,
    }, true)
  }).filter((entry) =>
    entry.sitTime > 0 ||
    entry.standTime > 0 ||
    entry.pomodoroWorkTime > 0 ||
    entry.pomodoroBreakTime > 0 ||
    entry.genericTimerTime > 0,
  )

  store.setTimerStatsHistory(existingEntries.filter((entry) => entry.timerId !== timerId))
  store.setStats(nextStats)
  store.setLifetimeStats(nextLifetime)
  store.setStatsHistory(nextHistory)

  return {
    stats: nextStats,
    statsHistory: nextHistory,
    lifetimeStats: nextLifetime,
  }
}

export function resetStats(categories: string[], scope: StatsResetScope = 'current'): {
  stats: GlobalStats
  statsHistory: StatsHistory[]
  lifetimeStats: GlobalStats
} {
  ensureAutoResetStats()

  if (scope === 'lifetime') {
    store.resetLifetimeStats(categories)
  } else {
    store.resetStats(categories)
  }

  return getStatsOverview()
}

export function getStatsValueForCategory(stats: GlobalStats, category: string): number {
  const key = CATEGORY_TO_BUCKET[category]
  return key ? stats[key] : 0
}

export function getTimerPeriodStats(timerId: string): TimerPeriodStats {
  const now = new Date()
  const timerType = getTimerType(timerId)
  const allEntries = store.getTimerStatsHistory().filter((entry) => entry.timerId === timerId)
  const todayKey = getDateKey(now)
  const month = now.getMonth()
  const year = now.getFullYear()

  const dayEntries = allEntries.filter((entry) => entry.date === todayKey)
  const day = sumTimerEntries(dayEntries, timerType)

  const weekEntries = filterTimerEntriesByDays(allEntries, now, 7)
  const week = sumTimerEntries(weekEntries, timerType)

  const monthEntries = allEntries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`)
    return entryDate.getFullYear() === year && entryDate.getMonth() === month
  })
  const monthTotal = sumTimerEntries(monthEntries, timerType)

  const yearEntries = allEntries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`)
    return entryDate.getFullYear() === year
  })
  const yearTotal = sumTimerEntries(yearEntries, timerType)

  return {
    day,
    week,
    month: monthTotal,
    year: yearTotal,
  }
}

export function exportAllTimerStatsCsv(): string {
  const timers = store.getTimers()
  const labelById = new Map(timers.map((timer) => [timer.id, timer.label]))
  const typeById = new Map(timers.map((timer) => [timer.id, timer.type]))

  const rows = [
    [
      'timer_id',
      'timer_label',
      'timer_type',
      'date',
      'sit_seconds',
      'stand_seconds',
      'pomodoro_work_seconds',
      'pomodoro_break_seconds',
      'generic_seconds',
      'total_seconds',
      'total_minutes',
    ],
    ...store.getTimerStatsHistory().map((entry) => {
      const normalized = normalizeTimerEntry(entry, typeById.get(entry.timerId))
      return [
        entry.timerId,
        labelById.get(entry.timerId) ?? 'Unknown Timer',
        typeById.get(entry.timerId) ?? 'unknown',
        entry.date,
        `${Math.round(normalized.sitTime)}`,
        `${Math.round(normalized.standTime)}`,
        `${Math.round(normalized.pomodoroWorkTime)}`,
        `${Math.round(normalized.pomodoroBreakTime)}`,
        `${Math.round(normalized.genericTimerTime)}`,
        `${Math.round(normalized.totalTime)}`,
        `${(normalized.totalTime / 60).toFixed(2)}`,
      ]
    }),
  ]

  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function sumBucketValues(values: Record<StatsBucketKey, number>): number {
  return STATS_BUCKET_KEYS.reduce((total, key) => total + (values[key] ?? 0), 0)
}

function applyBucketDeltas<T extends Record<StatsBucketKey, number>>(
  base: T,
  updates: Partial<Record<StatsBucketKey, number>>,
  clampAtZero = false,
): T {
  const next = { ...base }

  STATS_BUCKET_KEYS.forEach((key) => {
    const value = base[key] + (updates[key] ?? 0)
    next[key] = clampAtZero ? Math.max(0, value) : value
  })

  return next
}