import type { TimerConfig, TimerPeriodStats } from '../../../../types'
import type { SplitStatsView } from '../components/TimerTile/TimerSplitStatsSection'

type LiveStatsCategory = Exclude<keyof TimerPeriodStats['day'], 'totalTime'>

export function getPeriodValueForSplitView(
  stats: TimerPeriodStats,
  period: keyof TimerPeriodStats,
  view: SplitStatsView,
): number {
  const breakdown = stats[period]

  if (view === 'sit') return breakdown.sitTime
  if (view === 'stand') return breakdown.standTime
  if (view === 'work') return breakdown.pomodoroWorkTime
  return breakdown.pomodoroBreakTime
}

export function getLiveStatsCategory(
  timerType: TimerConfig['type'],
  resolvedPhaseLabel: string,
): LiveStatsCategory {
  if (timerType === 'sit-stand') {
    return resolvedPhaseLabel === 'Standing' ? 'standTime' : 'sitTime'
  }

  if (timerType === 'pomodoro') {
    return resolvedPhaseLabel === 'Short Break' || resolvedPhaseLabel === 'Long Break'
      ? 'pomodoroBreakTime'
      : 'pomodoroWorkTime'
  }

  return 'genericTimerTime'
}
