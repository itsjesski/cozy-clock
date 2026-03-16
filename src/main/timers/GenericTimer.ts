/**
 * Generic Timer - simple countdown or count-up
 */

import { BaseTimer } from './BaseTimer'
import type { TimerConfig } from '../../types'

export class GenericTimer extends BaseTimer {
  constructor(config: TimerConfig) {
    super(config)
  }

  getInitialDuration(): number {
    if (this.config.mode === 'countup') {
      return 0
    }

    return this.config.duration || 10 * 60 // Default 10 minutes
  }

  getPhaseLabel(): string {
    if (this.config.mode === 'countup') {
      return 'Counting Up'
    }
    return 'Countdown'
  }

  handleCompletion(): { isComplete: boolean; nextPhase?: any } {
    // Generic timer just marks as complete
    return { isComplete: true }
  }
}
