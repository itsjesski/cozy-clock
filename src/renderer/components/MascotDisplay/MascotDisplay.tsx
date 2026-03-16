import React, { useEffect, useMemo, useState } from 'react'
import type { AppSettings, MascotAnimationType } from '../../../types'
import styles from './MascotDisplay.module.css'

interface MascotDisplayProps {
  imagePath?: string
  size?: number
  scale?: number
  position?: AppSettings['mascotPosition']
  animationType?: MascotAnimationType | null
  animationNonce?: number
  embedded?: boolean
}

export const MascotDisplay: React.FC<MascotDisplayProps> = ({
  imagePath,
  size = 100,
  scale = 1,
  position = 'top-right',
  animationType,
  animationNonce,
  embedded = false,
}) => {
  const [activeAnimationClass, setActiveAnimationClass] = useState('')

  const resolvedPositionClass = useMemo(() => {
    switch (position) {
      case 'top-left':
        return styles.topLeft
      case 'bottom-left':
        return styles.bottomLeft
      case 'bottom-right':
        return styles.bottomRight
      case 'top-right':
      default:
        return styles.topRight
    }
  }, [position])

  useEffect(() => {
    if (!animationType) return

    const animationClassByType: Record<MascotAnimationType, string> = {
      shake: styles.shake,
      wiggle: styles.wiggle,
      bounce: styles.bounce,
    }

    setActiveAnimationClass(animationClassByType[animationType])
    const timeout = window.setTimeout(() => setActiveAnimationClass(''), 850)
    return () => window.clearTimeout(timeout)
  }, [animationType, animationNonce])

  if (!imagePath) {
    return null
  }

  return (
    <div className={`${styles.container} ${embedded ? styles.embedded : styles.fixed} ${resolvedPositionClass}`}>
      <div className={styles.scaleWrap} style={{ transform: `scale(${Math.max(0.3, Math.min(1.2, scale))})` }}>
        <img
          className={`${styles.image} ${activeAnimationClass}`}
          src={imagePath}
          alt="Mascot"
          style={{ width: size, height: size }}
        />
      </div>
    </div>
  )
}

export default MascotDisplay
