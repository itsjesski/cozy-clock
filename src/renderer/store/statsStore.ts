/**
 * Stats Zustand store
 */

import { create } from 'zustand'
import type { GlobalStats, StatsHistory, StatsPeriod } from '../../types'

const emptyStats = (): GlobalStats => ({
  sitTime: 0,
  standTime: 0,
  pomodoroWorkTime: 0,
  pomodoroBreakTime: 0,
  genericTimerTime: 0,
  lastResetAt: Date.now(),
})

interface StatsState {
  stats: GlobalStats
  lifetimeStats: GlobalStats
  history: StatsHistory[]
  selectedPeriod: StatsPeriod
  setStats: (stats: GlobalStats) => void
  setLifetimeStats: (stats: GlobalStats) => void
  setHistory: (history: StatsHistory[]) => void
  setSelectedPeriod: (period: StatsPeriod) => void
  setOverview: (overview: {
    stats: GlobalStats
    statsHistory: StatsHistory[]
    lifetimeStats: GlobalStats
  }) => void
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: emptyStats(),
  lifetimeStats: emptyStats(),
  history: [],
  selectedPeriod: 'today',
  setStats: (stats) => set({ stats }),
  setLifetimeStats: (lifetimeStats) => set({ lifetimeStats }),
  setHistory: (history) => set({ history }),
  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
  setOverview: (overview) =>
    set({
      stats: overview.stats,
      history: overview.statsHistory,
      lifetimeStats: overview.lifetimeStats,
    }),
}))
