import styles from './TimerTile.module.css'

interface TimerActionsProps {
  playPauseLabel: 'Start' | 'Pause' | 'Resume'
  isLoading: boolean
  onPlayPause: () => void
  onReset: () => void
}

export function TimerActions({
  playPauseLabel,
  isLoading,
  onPlayPause,
  onReset,
}: TimerActionsProps) {
  return <div className={styles.controls}>
    <button
      className={`${styles.controlButton} ${styles.playPauseBtn}`}
      onClick={onPlayPause}
      disabled={isLoading}
    >
      {playPauseLabel}
    </button>
    <button
      className={`${styles.controlButton} ${styles.resetBtn}`}
      onClick={onReset}
      disabled={isLoading}
    >
      Reset
    </button>
  </div>
}
