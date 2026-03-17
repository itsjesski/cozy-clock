import type { TimerConfig } from '../../../../types'
import {
  DEFAULT_GENERIC_DURATION,
  DEFAULT_SIT_DURATION,
  DEFAULT_STAND_DURATION,
  DEFAULT_POMODORO_WORK,
  DEFAULT_POMODORO_SHORT_BREAK,
  DEFAULT_POMODORO_LONG_BREAK,
} from '@shared/constants'

export function getResolvedPhaseLabel(
  type: TimerConfig['type'],
  mode: TimerConfig['mode'],
  currentPhaseLabel?: string,
): string {
  if (type === 'sit-stand') {
    return currentPhaseLabel === 'Standing' ? 'Standing' : 'Sitting'
  }

  if (type === 'pomodoro') {
    if (currentPhaseLabel === 'Short Break' || currentPhaseLabel === 'Long Break') {
      return currentPhaseLabel
    }

    return 'Work'
  }

  return mode === 'countup' ? 'Counting Up' : 'Countdown'
}

export function getPhaseTotalSeconds(
  config: {
    type: TimerConfig['type']
    mode: TimerConfig['mode']
    duration?: number
    sitDuration?: number
    standDuration?: number
    workDuration?: number
    shortBreakDuration?: number
    longBreakDuration?: number
  },
  currentPhaseLabel?: string,
): number {
  const resolvedPhaseLabel = getResolvedPhaseLabel(
    config.type,
    config.mode,
    currentPhaseLabel,
  )

  if (config.type === 'sit-stand') {
    return resolvedPhaseLabel === 'Standing'
      ? (config.standDuration ?? DEFAULT_STAND_DURATION)
      : (config.sitDuration ?? DEFAULT_SIT_DURATION)
  }

  if (config.type === 'pomodoro') {
    if (resolvedPhaseLabel === 'Work') return config.workDuration ?? DEFAULT_POMODORO_WORK
    if (resolvedPhaseLabel === 'Long Break') return config.longBreakDuration ?? DEFAULT_POMODORO_LONG_BREAK
    return config.shortBreakDuration ?? DEFAULT_POMODORO_SHORT_BREAK
  }

  return config.duration ?? DEFAULT_GENERIC_DURATION
}
