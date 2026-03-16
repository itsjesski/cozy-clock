/**
 * Base Timer class - provides common timer logic
 */

import type { TimerConfig, TimerState } from '../../types'

export abstract class BaseTimer {
  config: TimerConfig
  state: TimerState

  constructor(config: TimerConfig) {
    this.config = config
    this.state = {
      id: config.id,
      phase: 'idle',
      timeElapsed: 0,
      timeRemaining: this.getInitialDuration(),
      lastUpdatedAt: Date.now(),
    }
  }

  /**
   * Get the initial duration for this timer type
   */
  abstract getInitialDuration(): number

  /**
   * Get the current phase label (e.g., "Sitting", "Working")
   */
  abstract getPhaseLabel(): string

  /**
   * Handle timer completion (check if it's truly done or if there are more phases)
   */
  abstract handleCompletion(): { isComplete: boolean; nextPhase?: TimerState }

  /**
   * Update timer by delta milliseconds
   */
  tick(deltaTime: number): void {
    if (this.state.phase !== 'running') return

    const elapsedSeconds = deltaTime / 1000
    this.state.timeElapsed += elapsedSeconds
    if (this.config.mode === 'countup') {
      this.state.timeRemaining += elapsedSeconds
    } else {
      this.state.timeRemaining = Math.max(0, this.state.timeRemaining - elapsedSeconds)
    }
    this.state.lastUpdatedAt = Date.now()
  }

  /**
   * Start the timer
   */
  start(): void {
    this.state.phase = 'running'
    this.state.lastUpdatedAt = Date.now()
  }

  /**
   * Pause the timer
   */
  pause(): void {
    this.state.phase = 'paused'
  }

  /**
   * Resume the timer
   */
  resume(): void {
    this.state.phase = 'running'
    this.state.lastUpdatedAt = Date.now()
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.state.phase = 'idle'
    this.state.timeElapsed = 0
    this.state.timeRemaining = this.config.mode === 'countup' ? 0 : this.getInitialDuration()
    this.state.lastUpdatedAt = Date.now()
  }

  /**
   * Get current state
   */
  getState(): TimerState {
    return {
      ...this.state,
      currentPhaseLabel: this.getPhaseLabel(),
    }
  }
}
