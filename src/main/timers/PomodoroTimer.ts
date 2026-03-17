/**
 * Pomodoro Timer - work intervals with short and long breaks
 */

import { BaseTimer } from './BaseTimer'
import type { TimerConfig } from '../../types'

type PomodoroPhase = 'work' | 'short-break' | 'long-break'

export class PomodoroTimer extends BaseTimer {
  currentPhase: PomodoroPhase = 'work'
  completedRounds = 0
  roundsBeforeLongBreak: number

  constructor(config: TimerConfig) {
    super(config)
    this.roundsBeforeLongBreak = config.roundsBeforeLongBreak || 4
  }

  getInitialDuration(): number {
    if (this.config.mode === 'countup') {
      return 0
    }

    return this.config.workDuration || 25 * 60 // Default 25 minutes work
  }

  getPhaseLabel(): string {
    switch (this.currentPhase) {
      case 'work':
        return 'Work'
      case 'short-break':
        return 'Short Break'
      case 'long-break':
        return 'Long Break'
    }
  }

  handleCompletion(): { isComplete: boolean; nextPhase?: any } {
    const isLongBreakTime = (this.completedRounds + 1) % this.roundsBeforeLongBreak === 0
    const shouldAutoAdvance = this.config.autoAdvanceStages ?? this.config.autoLoop ?? true

    if (this.currentPhase === 'work') {
      if (isLongBreakTime) {
        this.currentPhase = 'long-break'
        this.state.timeRemaining = this.config.mode === 'countup'
          ? 0
          : (this.config.longBreakDuration || 15 * 60)
      } else {
        this.currentPhase = 'short-break'
        this.state.timeRemaining = this.config.mode === 'countup'
          ? 0
          : (this.config.shortBreakDuration || 5 * 60)
      }
      this.completedRounds++
      this.state.phase = shouldAutoAdvance ? 'running' : 'paused'
      this.state.timeElapsed = 0
      this.state.currentPhaseLabel = this.getPhaseLabel()
      return { isComplete: false, nextPhase: this.state }
    }

    this.currentPhase = 'work'
    this.state.timeRemaining = this.config.mode === 'countup'
      ? 0
      : (this.config.workDuration || 25 * 60)
    this.state.phase = shouldAutoAdvance ? 'running' : 'paused'
    this.state.timeElapsed = 0
    this.state.currentPhaseLabel = 'Work'
    return { isComplete: false, nextPhase: this.state }
  }
}
