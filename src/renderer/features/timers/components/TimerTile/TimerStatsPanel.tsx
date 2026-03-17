import { formatTimeHuman } from '@shared/utils'
import type { TimerConfig, TimerPeriodStats } from '../../../../../types'
import {
  TimerSplitStatsSection,
  type SplitStatsOption,
  type SplitStatsView,
} from './TimerSplitStatsSection'
import styles from './TimerTile.module.css'

interface TimerStatsPanelProps {
  timerType: TimerConfig['type']
  timerStats: TimerPeriodStats
  periods: Array<{ key: keyof TimerPeriodStats; label: string }>
  sitStandOptions: SplitStatsOption[]
  pomodoroOptions: SplitStatsOption[]
  splitStatsView: SplitStatsView
  setSplitStatsView: (view: SplitStatsView) => void
  getPeriodValueForView: (period: keyof TimerPeriodStats, view: SplitStatsView) => number
  isStatsLoading: boolean
  hasLoadedTimerStats: boolean
}

export function TimerStatsPanel({
  timerType,
  timerStats,
  periods,
  sitStandOptions,
  pomodoroOptions,
  splitStatsView,
  setSplitStatsView,
  getPeriodValueForView,
  isStatsLoading,
  hasLoadedTimerStats,
}: TimerStatsPanelProps) {
  const splitOptions = timerType === 'sit-stand' ? sitStandOptions : pomodoroOptions

  return (
    <div className={styles.statsPanel}>
      <h4 className={styles.statsTitle}>Timer Stats</h4>
      {timerType === 'generic' ? (
        <div className={styles.statsGrid}>
          {periods.map((period) => (
            <div key={period.key} className={styles.statsCard}>
              <span className={styles.statsLabel}>{period.label}</span>
              <strong className={styles.statsValue}>
                {formatTimeHuman(timerStats[period.key].totalTime)}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <TimerSplitStatsSection
          options={splitOptions}
          splitStatsView={splitStatsView}
          setSplitStatsView={setSplitStatsView}
          periods={periods}
          getPeriodValueForView={getPeriodValueForView}
        />
      )}
      {isStatsLoading && !hasLoadedTimerStats && <p className={styles.statsHint}>Loading stats…</p>}
    </div>
  )
}