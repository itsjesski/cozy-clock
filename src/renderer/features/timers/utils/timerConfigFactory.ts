import type { TimerConfig, TimerMode, TimerType } from '../../../../types'
import { minutesToSeconds, sanitizePositiveInt } from './timerMath'

interface BuildTimerConfigInput {
  timerId: string
  timerType: TimerType
  timerMode: TimerMode
  defaultModeByType: (type: TimerType) => TimerMode
  timerLabel: string
  timerIndex: number
  genericMinutes: number
  sitMinutes: number
  standMinutes: number
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  pomodoroRounds: number
}

function getFallbackLabelByType(type: TimerType, index: number): string {
  const fallbackLabelByType: Record<TimerType, string> = {
    generic: `Timer ${index}`,
    'sit-stand': `Sit Stand ${index}`,
    pomodoro: `Pomodoro ${index}`,
  }

  return fallbackLabelByType[type]
}

function buildTypeSpecificConfig(input: BuildTimerConfigInput): Partial<TimerConfig> {
  if (input.timerType === 'generic') {
    return { duration: minutesToSeconds(input.genericMinutes) }
  }

  if (input.timerType === 'sit-stand') {
    return {
      sitDuration: minutesToSeconds(input.sitMinutes),
      standDuration: minutesToSeconds(input.standMinutes),
    }
  }

  return {
    workDuration: minutesToSeconds(input.workMinutes),
    shortBreakDuration: minutesToSeconds(input.shortBreakMinutes),
    longBreakDuration: minutesToSeconds(input.longBreakMinutes),
    roundsBeforeLongBreak: sanitizePositiveInt(input.pomodoroRounds),
  }
}

export function buildTimerConfig(input: BuildTimerConfigInput): TimerConfig {
  const trimmedLabel = input.timerLabel.trim()

  const baseConfig: TimerConfig = {
    id: input.timerId,
    type: input.timerType,
    label: trimmedLabel || getFallbackLabelByType(input.timerType, input.timerIndex),
    displayMode: 'digital',
    mode:
      input.timerType === 'generic'
        ? input.timerMode
        : input.defaultModeByType(input.timerType),
    useGlobalAlertCues: true,
    useGlobalMascotSettings: true,
    useGlobalMascotAnimationCues: true,
  }

  return {
    ...baseConfig,
    ...buildTypeSpecificConfig(input),
  }
}
