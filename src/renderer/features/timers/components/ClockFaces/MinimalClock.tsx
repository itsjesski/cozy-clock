/**
 * Minimal text-only clock display
 */

import React from 'react'
import { formatTime } from '@shared/utils'
import styles from './MinimalClock.module.css'

interface MinimalClockProps {
  timeRemaining: number
}

export const MinimalClock: React.FC<MinimalClockProps> = ({ timeRemaining }) => {
  const value = formatTime(Math.ceil(timeRemaining))
  return (
    <div className={styles.minimalDisplay} aria-live="polite">
      <span key={value} className={styles.minimalValue}>
        {value}
      </span>
    </div>
  )
}

export default MinimalClock
