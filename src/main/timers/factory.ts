/**
 * Timer Factory - creates the correct timer type
 */

import { BaseTimer } from './BaseTimer'
import { SitStandTimer } from './SitStandTimer'
import { PomodoroTimer } from './PomodoroTimer'
import { GenericTimer } from './GenericTimer'
import type { TimerConfig } from '../../types'

export function createTimer(config: TimerConfig): BaseTimer {
  switch (config.type) {
    case 'sit-stand':
      return new SitStandTimer(config)
    case 'pomodoro':
      return new PomodoroTimer(config)
    case 'generic':
      return new GenericTimer(config)
    default:
      throw new Error(`Unknown timer type: ${config.type}`)
  }
}
