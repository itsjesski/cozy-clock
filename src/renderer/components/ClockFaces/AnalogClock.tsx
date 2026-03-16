/**
 * Analog clock display (SVG with rotating hands)
 */

import React from 'react'
import styles from './AnalogClock.module.css'

interface AnalogClockProps {
  timeRemaining: number
  total: number
}

export const AnalogClock: React.FC<AnalogClockProps> = ({ timeRemaining, total }) => {
  // Calculate hand positions based on remaining time
  const totalSeconds = total
  const remainingSeconds = Math.ceil(timeRemaining)
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds)

  // Hour hand: completes one rotation every 60 minutes (3600 seconds)
  const hourRotation = ((elapsedSeconds % 3600) / 3600) * 360

  // Minute hand: completes one rotation every 60 seconds
  const minuteRotation = ((elapsedSeconds % 60) / 60) * 360

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className={styles.clock}>
      {/* Clock face */}
      <circle cx="70" cy="70" r="65" fill="var(--bg-secondary)" stroke="var(--accent-primary)" strokeWidth="2" />

      {/* Hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30) * (Math.PI / 180)
        const x1 = 70 + 58 * Math.sin(angle)
        const y1 = 70 - 58 * Math.cos(angle)
        const x2 = 70 + 52 * Math.sin(angle)
        const y2 = 70 - 52 * Math.cos(angle)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-secondary)" strokeWidth="2" />
        )
      })}

      {/* Hour hand */}
      <g className={styles.hourHand} style={{ transform: `rotate(${hourRotation}deg)` }}>
        <line x1="70" y1="70" x2="70" y2="45" stroke="var(--text-primary)" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Minute hand */}
      <g className={styles.minuteHand} style={{ transform: `rotate(${minuteRotation}deg)` }}>
        <line x1="70" y1="70" x2="70" y2="30" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Center dot */}
      <circle cx="70" cy="70" r="4" fill="var(--accent-secondary)" />
    </svg>
  )
}

export default AnalogClock
