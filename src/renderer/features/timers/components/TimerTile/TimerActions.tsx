import styles from './TimerTile.module.css'

interface TimerActionsProps {
  playPauseLabel: 'Start' | 'Pause' | 'Resume' | 'Restart'
  isLoading: boolean
  showNextButton?: boolean
  onPlayPause: () => void
  onNextPhase?: () => void
  onReset: () => void
}

export function TimerActions({
  playPauseLabel,
  isLoading,
  showNextButton = false,
  onPlayPause,
  onNextPhase,
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
    {showNextButton && onNextPhase && (
      <button
        className={`${styles.controlButton} ${styles.nextBtn}`}
        onClick={onNextPhase}
        disabled={isLoading}
      >
        Next
      </button>
    )}
    <button
      className={`${styles.controlButton} ${styles.resetBtn}`}
      onClick={onReset}
      disabled={isLoading}
    >
      Reset
    </button>
  </div>
}
