import { useEffect, useRef, useState } from 'react'
import { useIpcSubscription } from '../../../hooks/useIpcSubscription'
import { getLiveStatsCategory } from '../utils/timerStats'
import type { TimerConfig, TimerPeriodStats, TimerState } from '../../../../types'

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

function createEmptyTimerPeriodStats(): TimerPeriodStats {
  return {
    day: createEmptyTimerBreakdown(),
    week: createEmptyTimerBreakdown(),
    month: createEmptyTimerBreakdown(),
    year: createEmptyTimerBreakdown(),
  }
}

const EMPTY_TIMER_PERIOD_STATS = createEmptyTimerPeriodStats()

function applyDeltaToPeriods(
  stats: TimerPeriodStats,
  delta: number,
  category: keyof TimerPeriodStats['day'],
): TimerPeriodStats {
  const applyDelta = (breakdown: TimerPeriodStats['day']): TimerPeriodStats['day'] => ({
    ...breakdown,
    totalTime: breakdown.totalTime + delta,
    [category]: breakdown[category] + delta,
  })

  return {
    day: applyDelta(stats.day),
    week: applyDelta(stats.week),
    month: applyDelta(stats.month),
    year: applyDelta(stats.year),
  }
}

interface UseTimerTileStatsOptions {
  id: string
  timerType: TimerConfig['type']
  timerState: TimerState
  isStatsFlipped: boolean
}

export function useTimerTileStats({
  id,
  timerType,
  timerState,
  isStatsFlipped,
}: UseTimerTileStatsOptions) {
  const [timerStats, setTimerStats] = useState<TimerPeriodStats>(EMPTY_TIMER_PERIOD_STATS)
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [hasLoadedTimerStats, setHasLoadedTimerStats] = useState(false)
  const lastLiveStatsElapsedRef = useRef(0)
  const lastLiveStatsPhaseRef = useRef<string | undefined>(undefined)

  const loadTimerStats = async (showLoading = false) => {
    if (showLoading) {
      setIsStatsLoading(true)
    }

    try {
      const result = await window.electronAPI?.getTimerStats(id)
      if (result?.success && result.data) {
        setTimerStats(result.data)
        setHasLoadedTimerStats(true)
      }
    } finally {
      if (showLoading) {
        setIsStatsLoading(false)
      }
    }
  }

  useEffect(() => {
    setTimerStats(EMPTY_TIMER_PERIOD_STATS)
    setHasLoadedTimerStats(false)
    setIsStatsLoading(false)
    lastLiveStatsElapsedRef.current = 0
    lastLiveStatsPhaseRef.current = undefined
  }, [id])

  useEffect(() => {
    if (!isStatsFlipped || !hasLoadedTimerStats) {
      lastLiveStatsElapsedRef.current = Math.max(0, Math.floor(timerState.timeElapsed || 0))
      lastLiveStatsPhaseRef.current = timerState.currentPhaseLabel
      return
    }

    const currentWholeElapsed = Math.max(0, Math.floor(timerState.timeElapsed || 0))
    const previousElapsed = lastLiveStatsElapsedRef.current
    const previousPhase = lastLiveStatsPhaseRef.current

    if (
      timerState.phase !== 'running' ||
      previousPhase !== timerState.currentPhaseLabel ||
      currentWholeElapsed < previousElapsed
    ) {
      lastLiveStatsElapsedRef.current = currentWholeElapsed
      lastLiveStatsPhaseRef.current = timerState.currentPhaseLabel
      return
    }

    const delta = currentWholeElapsed - previousElapsed
    if (delta <= 0) {
      return
    }

    const category = getLiveStatsCategory(timerType, timerState.currentPhaseLabel ?? '')
    setTimerStats((prev) => applyDeltaToPeriods(prev, delta, category))

    lastLiveStatsElapsedRef.current = currentWholeElapsed
    lastLiveStatsPhaseRef.current = timerState.currentPhaseLabel
  }, [
    hasLoadedTimerStats,
    isStatsFlipped,
    timerState.currentPhaseLabel,
    timerState.phase,
    timerState.timeElapsed,
    timerType,
  ])

  useEffect(() => {
    if (!isStatsFlipped) return
    void loadTimerStats(!hasLoadedTimerStats)
  }, [hasLoadedTimerStats, id, isStatsFlipped])

  useIpcSubscription(() => {
    const handleStatsUpdate = () => {
      if (!isStatsFlipped) return
      void loadTimerStats(false)
    }

    return window.electronAPI?.onStatsUpdate(handleStatsUpdate)
  }, [id, isStatsFlipped])

  return {
    timerStats,
    isStatsLoading,
    hasLoadedTimerStats,
    loadTimerStats,
  }
}