import type { TimerPeriodStats } from '../../../../../types'
import { formatTimeHuman } from '@shared/utils'
import styles from './TimerTile.module.css'

export type SplitStatsView = 'sit' | 'stand' | 'work' | 'break'

export type SplitStatsOption = { key: SplitStatsView; label: string }

interface TimerSplitStatsSectionProps {
  options: SplitStatsOption[]
  splitStatsView: SplitStatsView
  setSplitStatsView: (view: SplitStatsView) => void
  periods: Array<{ key: keyof TimerPeriodStats; label: string }>
  getPeriodValueForView: (period: keyof TimerPeriodStats, view: SplitStatsView) => number
}

export function TimerSplitStatsSection({
  options,
  splitStatsView,
  setSplitStatsView,
  periods,
  getPeriodValueForView,
}: TimerSplitStatsSectionProps) {
  return (
    <div className={styles.statsSections}>
      <div className={styles.statsToggleRow}>
        {options.map((option) => (
          <button
            key={option.key}
            className={`${styles.statsToggleButton} ${splitStatsView === option.key ? styles.statsToggleButtonActive : ''}`}
            onClick={() => setSplitStatsView(option.key)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.statsGrid}>
        {periods.map((period) => (
          <div key={`${splitStatsView}-${String(period.key)}`} className={styles.statsCard}>
            <span className={styles.statsLabel}>{period.label}</span>
            <strong className={styles.statsValue}>
              {formatTimeHuman(getPeriodValueForView(period.key, splitStatsView))}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}
