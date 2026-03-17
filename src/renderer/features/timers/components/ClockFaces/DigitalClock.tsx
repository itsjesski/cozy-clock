/**
 * Simple digital clock display
 */

import React from 'react'
import { formatTime } from '@shared/utils'
import styles from './DigitalClock.module.css'

interface DigitalClockProps {
  timeRemaining: number
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ timeRemaining }) => {
  const value = formatTime(Math.ceil(timeRemaining))

  return (
    <div className={styles.digitalDisplay} aria-live="polite">
      {value}
    </div>
  )
}

export default DigitalClock
