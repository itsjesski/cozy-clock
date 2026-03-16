/**
 * Progress ring clock display with percentage
 */

import React from 'react'
import { formatTime } from '@shared/utils'
import styles from './RingClock.module.css'

interface RingClockProps {
  timeRemaining: number
  total: number
}

export const RingClock: React.FC<RingClockProps> = ({ timeRemaining, total }) => {
  const percentage = Math.max(0, (timeRemaining / total) * 100)
  const circumference = 2 * Math.PI * 45
  const formatted = formatTime(Math.ceil(timeRemaining))
  const roundedPercent = Math.round(percentage)

  return (
    <div className={styles.ringContainer}>
      <svg width="120" height="120" className={styles.ringSvg}>
        {/* Background ring */}
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e8e0d5" strokeWidth="4" />

        {/* Progress ring */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="#d4a373"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percentage / 100)}
          className={styles.progressRing}
        />

        <text key={formatted} x="60" y="60" textAnchor="middle" dominantBaseline="central" className={styles.timeDisplaySvg}>
          {formatted}
        </text>
      </svg>

      {/* Percentage */}
      <div key={`p-${roundedPercent}`} className={styles.percentage}>{roundedPercent}%</div>
    </div>
  )
}

export default RingClock
