import { useState } from 'react'
import { DEFAULT_POMODORO_ROUNDS, DEFAULT_TIMER_MINUTES } from '@shared/timerDefaults'
import { generateId } from '@shared/utils'
import { buildTimerConfig } from '../utils/timerConfigFactory'
import type { TimerConfig, TimerMode, TimerType } from '../../../../types'

export interface CreateTimerFormState {
  timerType: TimerType
  timerLabel: string
  timerMode: TimerMode
  genericMinutes: number
  sitMinutes: number
  standMinutes: number
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  pomodoroRounds: number
}

interface UseCreateTimerFormParams {
  timers: TimerConfig[]
  setTimers: React.Dispatch<React.SetStateAction<TimerConfig[]>>
  getDefaultModeByType: (type: TimerType) => TimerMode
  setIsCreateTimerOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function useCreateTimerForm({
  timers,
  setTimers,
  getDefaultModeByType,
  setIsCreateTimerOpen,
}: UseCreateTimerFormParams) {
  const [form, setForm] = useState<CreateTimerFormState>({
    timerType: 'generic',
    timerLabel: '',
    timerMode: 'countdown',
    genericMinutes: DEFAULT_TIMER_MINUTES.generic,
    sitMinutes: DEFAULT_TIMER_MINUTES.sit,
    standMinutes: DEFAULT_TIMER_MINUTES.stand,
    workMinutes: DEFAULT_TIMER_MINUTES.work,
    shortBreakMinutes: DEFAULT_TIMER_MINUTES.shortBreak,
    longBreakMinutes: DEFAULT_TIMER_MINUTES.longBreak,
    pomodoroRounds: DEFAULT_POMODORO_ROUNDS,
  })

  const setFormField = <K extends keyof CreateTimerFormState>(
    key: K,
    value: CreateTimerFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreateTimer = async () => {
    const nextIndex = timers.length + 1
    const timerId = generateId()
    const timerConfig = buildTimerConfig({
      timerId,
      timerType: form.timerType,
      timerMode: form.timerMode,
      defaultModeByType: getDefaultModeByType,
      timerLabel: form.timerLabel,
      timerIndex: nextIndex,
      genericMinutes: form.genericMinutes,
      sitMinutes: form.sitMinutes,
      standMinutes: form.standMinutes,
      workMinutes: form.workMinutes,
      shortBreakMinutes: form.shortBreakMinutes,
      longBreakMinutes: form.longBreakMinutes,
      pomodoroRounds: form.pomodoroRounds,
    })

    setTimers((prev) => [...prev, timerConfig])
    setIsCreateTimerOpen(false)
    setFormField('timerLabel', '')

    try {
      const result = await window.electronAPI?.createTimer(timerConfig)
      if (result && !result.success) {
        console.warn('Create timer request was not accepted by main process.')
      }
    } catch {
      // Keep optimistic UI behavior; this can happen briefly during hot reload
    }
  }

  return {
    form,
    setFormField,
    handleCreateTimer,
  }
}