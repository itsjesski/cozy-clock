import React from 'react'
import styles from './TimerTile.module.css'

interface TimerActionsProps {
  playPauseLabel: 'Start' | 'Pause' | 'Resume'
  isLoading: boolean
  onPlayPause: () => void
  onReset: () => void
}

export const TimerActions: React.FC<TimerActionsProps> = ({
  playPauseLabel,
  isLoading,
  onPlayPause,
  onReset,
}) => {
  return (
    <div className={styles.controls}>
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
  )
}
