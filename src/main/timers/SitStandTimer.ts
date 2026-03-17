/**
 * Sit/Stand Timer - alternates between sitting and standing periods
 */

import { BaseTimer } from './BaseTimer'
import type { TimerConfig, TimerState } from '../../types'

type SitStandPhase = 'sitting' | 'standing'

export class SitStandTimer extends BaseTimer {
  currentPhase: SitStandPhase = 'sitting'
  completedCycles = 0

  constructor(config: TimerConfig) {
    super(config)
  }

  getInitialDuration(): number {
    if (this.config.mode === 'countup') {
      return 0
    }

    return (this.config.sitDuration || 25 * 60) // Default 25 minutes
  }

  getPhaseLabel(): string {
    return this.currentPhase === 'sitting' ? 'Sitting' : 'Standing'
  }

  handleCompletion(): { isComplete: boolean; nextPhase?: TimerState } {
    const shouldAutoAdvance = this.config.autoAdvanceStages ?? this.config.autoLoop ?? true

    if (this.currentPhase === 'sitting') {
      this.currentPhase = 'standing'
      this.state.phase = shouldAutoAdvance ? 'running' : 'paused'
      this.state.timeElapsed = 0
      this.state.timeRemaining = this.config.mode === 'countup'
        ? 0
        : (this.config.standDuration || 5 * 60)
      this.state.currentPhaseLabel = 'Standing'
      return { isComplete: false, nextPhase: this.state }
    }

    this.completedCycles++
    this.currentPhase = 'sitting'
    this.state.phase = shouldAutoAdvance ? 'running' : 'paused'
    this.state.timeElapsed = 0
    this.state.timeRemaining = this.config.mode === 'countup'
      ? 0
      : (this.config.sitDuration || 25 * 60)
    this.state.currentPhaseLabel = 'Sitting'
    return { isComplete: false, nextPhase: this.state }
  }
}
