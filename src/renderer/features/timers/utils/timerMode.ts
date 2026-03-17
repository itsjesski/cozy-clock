import type { AppSettings, TimerMode, TimerType } from '../../../../types'

export function resolveDefaultModeByTimerType(
  timerType: TimerType,
  settings: AppSettings,
): TimerMode {
  if (timerType === 'sit-stand') {
    return (settings.defaultSitStandMode ?? 'countdown') as TimerMode
  }

  if (timerType === 'pomodoro') {
    return (settings.defaultPomodoroMode ?? 'countdown') as TimerMode
  }

  return (settings.defaultGenericMode ?? 'countdown') as TimerMode
}
