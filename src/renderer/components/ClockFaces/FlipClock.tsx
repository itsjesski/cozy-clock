/**
 * Flip clock display with card-flip animation
 */

import React, { useEffect, useMemo, useState } from 'react'
import { formatTime } from '@shared/utils'
import styles from './FlipClock.module.css'

interface FlipClockProps {
  timeRemaining: number
}

export const FlipClock: React.FC<FlipClockProps> = ({ timeRemaining }) => {
  const timeString = useMemo(() => formatTime(Math.ceil(timeRemaining)), [timeRemaining])
  const [previousChars, setPreviousChars] = useState(timeString.split(''))
  const [flippingIndexes, setFlippingIndexes] = useState<number[]>([])

  useEffect(() => {
    if (previousChars.length !== timeString.length) {
      setPreviousChars(timeString.split(''))
    }
  }, [previousChars.length, timeString])

  useEffect(() => {
    const nextChars = timeString.split('')
    const changedIndexes: number[] = []

    nextChars.forEach((char, index) => {
      if (previousChars[index] !== char && char !== ':') {
        changedIndexes.push(index)
      }
    })

    if (changedIndexes.length === 0) {
      return
    }

    setFlippingIndexes(changedIndexes)
    const timeout = window.setTimeout(() => {
      setPreviousChars(nextChars)
      setFlippingIndexes([])
    }, 520)

    return () => window.clearTimeout(timeout)
  }, [timeString, previousChars])

  return (
    <div className={styles.flipClockContainer}>
      <div className={styles.flipDisplay}>
        {timeString.split('').map((digit, idx) => (
          <React.Fragment key={idx}>
            {digit === ':' ? (
              <div className={styles.separator}>:</div>
            ) : (
              <div className={styles.flipCard} aria-hidden="true">
                <div className={styles.staticBottom}>
                  <span className={styles.digitText}>{digit}</span>
                </div>
                {flippingIndexes.includes(idx) && (
                  <div className={styles.flipBottom}>
                    <span className={styles.digitText}>{digit}</span>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default FlipClock
