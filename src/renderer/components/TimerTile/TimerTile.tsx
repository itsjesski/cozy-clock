/**
 * TimerTile component - individual timer display with all clock modes
 */

import React, { useEffect, useMemo, useState } from 'react'
import { createTimerStore } from '../../store/timerStore'
import { DigitalClock } from '../ClockFaces/DigitalClock'
import { AnalogClock } from '../ClockFaces/AnalogClock'
import { RingClock } from '../ClockFaces/RingClock'
import { FlipClock } from '../ClockFaces/FlipClock'
import { MascotDisplay } from '../MascotDisplay/MascotDisplay'
import { useGlobalStore } from '../../store/globalStore'
import styles from './TimerTile.module.css'
import { formatTimeHuman, generateId } from '@shared/utils'
import type {
  TimerState,
  ClockDisplayMode,
  AlertCue,
  TimerConfig,
  MascotAnimationCue,
  MascotAnimationType,
  TimerPeriodStats,
} from '../../../types/index'

interface TimerTileProps {
  id: string
  label: string
  isCompact?: boolean
  timerType: TimerConfig['type']
  timerMode: TimerConfig['mode']
  displayMode?: ClockDisplayMode
  duration?: number
  sitDuration?: number
  standDuration?: number
  autoLoop?: boolean
  continueFromLastTime?: boolean
  continueWhileAppClosed?: boolean
  workDuration?: number
  shortBreakDuration?: number
  longBreakDuration?: number
  roundsBeforeLongBreak?: number
  includeSitInStats?: boolean
  includeStandInStats?: boolean
  includePomodoroWorkInStats?: boolean
  includePomodoroBreakInStats?: boolean
  accentColor?: string
  alertVolume?: number
  alertCues?: AlertCue[]
  useGlobalAlertCues?: boolean
  mascotImagePath?: string
  mascotSize?: number
  mascotScale?: number
  mascotPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  useGlobalMascotSettings?: boolean
  mascotAnimationCues?: MascotAnimationCue[]
  useGlobalMascotAnimationCues?: boolean
  onLabelChange?: (id: string, label: string) => void
  onDisplayModeChange?: (id: string, mode: ClockDisplayMode) => void
  onTimerConfigChange?: (id: string, updates: Partial<TimerConfig>) => void
  onDeleteTimer?: (id: string) => void
}

const DISPLAY_MODE_OPTIONS: Array<Exclude<ClockDisplayMode, 'minimal'>> = [
  'digital',
  'analog',
  'ring',
  'flip',
]
const DISPLAY_MODE_LABELS: Record<Exclude<ClockDisplayMode, 'minimal'>, string> = {
  digital: 'Digital',
  analog: 'Analog',
  ring: 'Ring',
  flip: 'Flip',
}
const EMPTY_ALERT_CUES: AlertCue[] = []
const EMPTY_MASCOT_CUES: MascotAnimationCue[] = []
const LEGACY_DEFAULT_ACCENT = '#d4a574'
const PERIODS: Array<{ key: keyof TimerPeriodStats; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
]
type SplitStatsView = 'sit' | 'stand' | 'work' | 'break'
const createEmptyTimerBreakdown = (): TimerPeriodStats['day'] => ({
  totalTime: 0,
  sitTime: 0,
  standTime: 0,
  pomodoroWorkTime: 0,
  pomodoroBreakTime: 0,
  genericTimerTime: 0,
})
const EMPTY_TIMER_PERIOD_STATS: TimerPeriodStats = {
  day: createEmptyTimerBreakdown(),
  week: createEmptyTimerBreakdown(),
  month: createEmptyTimerBreakdown(),
  year: createEmptyTimerBreakdown(),
}

const getThemeAccentColor = () => {
  if (typeof window === 'undefined') {
    return LEGACY_DEFAULT_ACCENT
  }

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-primary')
    .trim()

  return accent || LEGACY_DEFAULT_ACCENT
}

export const TimerTile: React.FC<TimerTileProps> = ({
  id,
  label,
  isCompact = false,
  timerType,
  timerMode,
  displayMode = 'digital',
  duration,
  sitDuration,
  standDuration,
  autoLoop = true,
  continueFromLastTime,
  continueWhileAppClosed,
  workDuration,
  shortBreakDuration,
  longBreakDuration,
  roundsBeforeLongBreak,
  includeSitInStats,
  includeStandInStats,
  includePomodoroWorkInStats,
  includePomodoroBreakInStats,
  accentColor,
  alertVolume,
  alertCues,
  useGlobalAlertCues = true,
  mascotImagePath,
  mascotSize,
  mascotScale,
  mascotPosition,
  useGlobalMascotSettings = true,
  mascotAnimationCues,
  useGlobalMascotAnimationCues = true,
  onLabelChange,
  onDisplayModeChange,
  onTimerConfigChange,
  onDeleteTimer,
}) => {
  const getResolvedPhaseLabel = (
    type: TimerConfig['type'],
    mode: TimerConfig['mode'],
    currentPhaseLabel?: string,
  ) => {
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

  const getPhaseTotalSeconds = (
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
  ) => {
    const resolvedPhaseLabel = getResolvedPhaseLabel(
      config.type,
      config.mode,
      currentPhaseLabel,
    )

    if (config.type === 'sit-stand') {
      return resolvedPhaseLabel === 'Standing'
        ? (config.standDuration ?? 5 * 60)
        : (config.sitDuration ?? 25 * 60)
    }

    if (config.type === 'pomodoro') {
      if (resolvedPhaseLabel === 'Work') return config.workDuration ?? 25 * 60
      if (resolvedPhaseLabel === 'Long Break') return config.longBreakDuration ?? 15 * 60
      return config.shortBreakDuration ?? 5 * 60
    }

    return config.duration ?? 10 * 60
  }

  const getCurrentConfigSnapshot = () => ({
    type: timerType,
    mode: timerMode,
    duration,
    sitDuration,
    standDuration,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
  })

  const getCurrentPhaseTotal = (phaseLabel?: string) =>
    getPhaseTotalSeconds(getCurrentConfigSnapshot(), phaseLabel)

  const [state, setState] = useState<TimerState>({
    id,
    phase: 'idle',
    timeElapsed: 0,
    timeRemaining: getCurrentPhaseTotal(),
    currentPhaseLabel: getResolvedPhaseLabel(timerType, timerMode),
    lastUpdatedAt: Date.now(),
  })

  const [currentDisplayMode, setCurrentDisplayMode] = useState<ClockDisplayMode>(
    displayMode === 'minimal' ? 'digital' : displayMode,
  )
  const [editableLabel, setEditableLabel] = useState(label)
  const [editableTimerMode, setEditableTimerMode] = useState(timerMode)
  const [editableDurationMinutes, setEditableDurationMinutes] = useState(Math.round((duration ?? 1500) / 60))
  const [editableSitDurationMinutes, setEditableSitDurationMinutes] = useState(
    Math.round((sitDuration ?? 25 * 60) / 60),
  )
  const [editableStandDurationMinutes, setEditableStandDurationMinutes] = useState(
    Math.round((standDuration ?? 5 * 60) / 60),
  )
  const [editableAutoLoop, setEditableAutoLoop] = useState(autoLoop)
  const [editableContinueFromLastTime, setEditableContinueFromLastTime] =
    useState(false)
  const [editableContinueWhileAppClosed, setEditableContinueWhileAppClosed] =
    useState(false)
  const [editableWorkDurationMinutes, setEditableWorkDurationMinutes] = useState(
    Math.round((workDuration ?? 25 * 60) / 60),
  )
  const [editableShortBreakMinutes, setEditableShortBreakMinutes] = useState(
    Math.round((shortBreakDuration ?? 5 * 60) / 60),
  )
  const [editableLongBreakMinutes, setEditableLongBreakMinutes] = useState(
    Math.round((longBreakDuration ?? 15 * 60) / 60),
  )
  const [editablePomodoroRounds, setEditablePomodoroRounds] = useState(roundsBeforeLongBreak ?? 4)
  const [editableIncludeSitInStats, setEditableIncludeSitInStats] = useState(
    includeSitInStats ?? true,
  )
  const [editableIncludeStandInStats, setEditableIncludeStandInStats] = useState(
    includeStandInStats ?? true,
  )
  const [editableIncludePomodoroWorkInStats, setEditableIncludePomodoroWorkInStats] = useState(
    includePomodoroWorkInStats ?? true,
  )
  const [editableIncludePomodoroBreakInStats, setEditableIncludePomodoroBreakInStats] = useState(
    includePomodoroBreakInStats ?? false,
  )
  const globalSettings = useGlobalStore((store) => store.settings)
  const themeAccentColor = getThemeAccentColor()
  const resolvedAccentColor =
    accentColor?.trim().toLowerCase() === LEGACY_DEFAULT_ACCENT &&
    themeAccentColor.toLowerCase() !== LEGACY_DEFAULT_ACCENT
      ? undefined
      : accentColor
  const [editableAccentColor, setEditableAccentColor] = useState(
    resolvedAccentColor || themeAccentColor,
  )

  const [editableUseGlobalAlertVolume, setEditableUseGlobalAlertVolume] = useState(
    alertVolume === undefined,
  )
  const [editableAlertVolume, setEditableAlertVolume] = useState(
    alertVolume ?? (globalSettings.defaultAlertVolume ?? 80),
  )
  const [editableUseGlobalAlertCues, setEditableUseGlobalAlertCues] = useState(useGlobalAlertCues)
  const resolvedAlertCues = alertCues ?? EMPTY_ALERT_CUES
  const [editableAlertCues, setEditableAlertCues] = useState<AlertCue[]>(resolvedAlertCues)
  const [editableUseGlobalMascotSettings, setEditableUseGlobalMascotSettings] =
    useState(useGlobalMascotSettings)
  const [editableMascotImagePath, setEditableMascotImagePath] = useState(mascotImagePath || '')
  const [editableMascotSize, setEditableMascotSize] = useState(
    mascotSize ?? (globalSettings.mascotSize ?? 100),
  )
  const [editableMascotScale, setEditableMascotScale] = useState(
    mascotScale ?? (globalSettings.mascotScale ?? 0.65),
  )
  const [editableMascotPosition, setEditableMascotPosition] = useState(
    mascotPosition ?? (globalSettings.mascotPosition ?? 'top-right'),
  )
  const [editableUseGlobalMascotCues, setEditableUseGlobalMascotCues] = useState(
    useGlobalMascotAnimationCues,
  )
  const resolvedMascotAnimationCues = mascotAnimationCues ?? EMPTY_MASCOT_CUES
  const [editableMascotAnimationCues, setEditableMascotAnimationCues] =
    useState<MascotAnimationCue[]>(resolvedMascotAnimationCues)
  const [mascotAnimationType, setMascotAnimationType] = useState<MascotAnimationType | null>(null)
  const [mascotAnimationNonce, setMascotAnimationNonce] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'clock' | 'overrides'>('clock')
  const [isLoading, setIsLoading] = useState(false)
  const [isStatsFlipped, setIsStatsFlipped] = useState(false)
  const [timerStats, setTimerStats] = useState<TimerPeriodStats>(EMPTY_TIMER_PERIOD_STATS)
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [splitStatsView, setSplitStatsView] = useState<SplitStatsView>(
    timerType === 'pomodoro' ? 'work' : 'sit',
  )

  const mascotAnimationTypes: MascotAnimationType[] = ['shake', 'wiggle', 'bounce']

  const timerStore = createTimerStore(id)

  // Subscribe to timer store updates
  useEffect(() => {
    const handleStateChange = () => {
      const currentState = timerStore.getState()
      setState(currentState.state)
    }

    const unsubscribe = timerStore.subscribe(handleStateChange)
    return () => unsubscribe()
  }, [timerStore])

  // Subscribe to IPC timer tick events
  useEffect(() => {
    const handleTimerTick = (data: any) => {
      if (data?.id === id) {
        setState((prev) => ({
          ...prev,
          phase: data.phase ?? prev.phase,
          timeElapsed: data.timeElapsed ?? prev.timeElapsed,
          timeRemaining: data.timeRemaining ?? prev.timeRemaining,
          currentPhaseLabel: data.currentPhaseLabel,
          lastUpdatedAt: Date.now(),
        }))
      }
    }

    const unsubscribe = window.electronAPI?.onTimerTick(handleTimerTick)
    return () => {
      unsubscribe?.()
    }
  }, [id])

  useEffect(() => {
    setEditableLabel(label)
  }, [label])

  useEffect(() => {
    setEditableTimerMode(timerMode)
  }, [timerMode])

  useEffect(() => {
    setEditableDurationMinutes(Math.round((duration ?? 1500) / 60))
  }, [duration])

  useEffect(() => {
    setEditableSitDurationMinutes(Math.round((sitDuration ?? 25 * 60) / 60))
  }, [sitDuration])

  useEffect(() => {
    setEditableStandDurationMinutes(Math.round((standDuration ?? 5 * 60) / 60))
  }, [standDuration])

  useEffect(() => {
    setEditableAutoLoop(autoLoop)
  }, [autoLoop])

  useEffect(() => {
    setEditableContinueFromLastTime(
      (continueFromLastTime ?? globalSettings.defaultContinueFromLastTime) ?? false,
    )
  }, [continueFromLastTime, globalSettings.defaultContinueFromLastTime])

  useEffect(() => {
    setEditableContinueWhileAppClosed(
      (continueWhileAppClosed ?? globalSettings.defaultContinueWhileAppClosed) ?? false,
    )
  }, [continueWhileAppClosed, globalSettings.defaultContinueWhileAppClosed])

  useEffect(() => {
    setEditableWorkDurationMinutes(Math.round((workDuration ?? 25 * 60) / 60))
  }, [workDuration])

  useEffect(() => {
    setEditableShortBreakMinutes(Math.round((shortBreakDuration ?? 5 * 60) / 60))
  }, [shortBreakDuration])

  useEffect(() => {
    setEditableLongBreakMinutes(Math.round((longBreakDuration ?? 15 * 60) / 60))
  }, [longBreakDuration])

  useEffect(() => {
    setEditablePomodoroRounds(roundsBeforeLongBreak ?? 4)
  }, [roundsBeforeLongBreak])

  useEffect(() => {
    setEditableIncludeSitInStats(includeSitInStats ?? true)
  }, [includeSitInStats])

  useEffect(() => {
    setEditableIncludeStandInStats(includeStandInStats ?? true)
  }, [includeStandInStats])

  useEffect(() => {
    setEditableIncludePomodoroWorkInStats(includePomodoroWorkInStats ?? true)
  }, [includePomodoroWorkInStats])

  useEffect(() => {
    setEditableIncludePomodoroBreakInStats(includePomodoroBreakInStats ?? false)
  }, [includePomodoroBreakInStats])

  useEffect(() => {
    setSplitStatsView(timerType === 'pomodoro' ? 'work' : 'sit')
  }, [timerType])

  useEffect(() => {
    setCurrentDisplayMode(displayMode === 'minimal' ? 'digital' : displayMode)
  }, [displayMode])

  useEffect(() => {
    setEditableAccentColor(resolvedAccentColor || themeAccentColor)
  }, [resolvedAccentColor, themeAccentColor, globalSettings.theme])

  useEffect(() => {
    const handleMascotAnimate = (data: { id?: string; animation?: MascotAnimationType }) => {
      if (data?.id !== id || !data.animation) return
      setMascotAnimationType(data.animation)
      setMascotAnimationNonce((value) => value + 1)
    }

    const unsubscribe = window.electronAPI?.onMascotAnimate(handleMascotAnimate)
    return () => {
      unsubscribe?.()
    }
  }, [id])

  useEffect(() => {
    const handleTimerStateUpdate = (data: { states?: Record<string, TimerState> }) => {
      const nextState = data?.states?.[id]
      if (!nextState) return
      setState(nextState)
    }

    const unsubscribe = window.electronAPI?.onTimerStateUpdate(handleTimerStateUpdate)
    return () => {
      unsubscribe?.()
    }
  }, [id])

  const loadTimerStats = async () => {
    setIsStatsLoading(true)
    try {
      const result = await window.electronAPI?.getTimerStats(id)
      if (result?.success && result.data) {
        setTimerStats(result.data)
      }
    } finally {
      setIsStatsLoading(false)
    }
  }

  useEffect(() => {
    if (!isStatsFlipped) return
    loadTimerStats()
  }, [id, isStatsFlipped])

  useEffect(() => {
    const handleStatsUpdate = () => {
      if (!isStatsFlipped) return
      loadTimerStats()
    }

    const unsubscribe = window.electronAPI?.onStatsUpdate(handleStatsUpdate)
    return () => {
      unsubscribe?.()
    }
  }, [isStatsFlipped])

  useEffect(() => {
    setEditableUseGlobalAlertVolume(alertVolume === undefined)
    setEditableAlertVolume(alertVolume ?? (globalSettings.defaultAlertVolume ?? 80))
  }, [alertVolume, globalSettings.defaultAlertVolume])

  useEffect(() => {
    setEditableUseGlobalAlertCues(useGlobalAlertCues)
  }, [useGlobalAlertCues])

  useEffect(() => {
    setEditableAlertCues(resolvedAlertCues)
  }, [resolvedAlertCues])

  useEffect(() => {
    setEditableUseGlobalMascotSettings(useGlobalMascotSettings)
  }, [useGlobalMascotSettings])

  useEffect(() => {
    setEditableMascotImagePath(mascotImagePath || '')
  }, [mascotImagePath])

  useEffect(() => {
    setEditableMascotSize(mascotSize ?? (globalSettings.mascotSize ?? 100))
  }, [mascotSize, globalSettings.mascotSize])

  useEffect(() => {
    setEditableMascotScale(mascotScale ?? (globalSettings.mascotScale ?? 0.65))
  }, [mascotScale, globalSettings.mascotScale])

  useEffect(() => {
    setEditableMascotPosition(mascotPosition ?? (globalSettings.mascotPosition ?? 'top-right'))
  }, [mascotPosition, globalSettings.mascotPosition])

  useEffect(() => {
    setEditableUseGlobalMascotCues(useGlobalMascotAnimationCues)
  }, [useGlobalMascotAnimationCues])

  useEffect(() => {
    setEditableMascotAnimationCues(resolvedMascotAnimationCues)
  }, [resolvedMascotAnimationCues])

  // Render appropriate clock face
  const renderClockFace = () => {
    const commonProps = {
      timeRemaining: state.timeRemaining,
      total: getCurrentPhaseTotal(state.currentPhaseLabel),
    }

    switch (currentDisplayMode) {
      case 'analog':
        return <AnalogClock {...commonProps} />
      case 'ring':
        return <RingClock {...commonProps} />
      case 'flip':
        return <FlipClock timeRemaining={state.timeRemaining} />
      case 'minimal':
        return <DigitalClock timeRemaining={state.timeRemaining} />
      case 'digital':
      default:
        return <DigitalClock timeRemaining={state.timeRemaining} />
    }
  }

  const handlePlayPause = async () => {
    setIsLoading(true)
    try {
      if (state.phase === 'running') {
        await window.electronAPI?.pauseTimer(id)
        setState((prev) => ({ ...prev, phase: 'paused' }))
      } else if (state.phase === 'paused') {
        await window.electronAPI?.resumeTimer(id)
        setState((prev) => ({ ...prev, phase: 'running' }))
      } else {
        await window.electronAPI?.startTimer(id)
        setState((prev) => ({ ...prev, phase: 'running' }))
      }
    } catch (error) {
      console.error('Error toggling timer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    setIsLoading(true)
    try {
      await window.electronAPI?.resetTimer(id)
      setState((prev) => ({
        ...prev,
        phase: 'idle',
        timeElapsed: 0,
        timeRemaining: getCurrentPhaseTotal(prev.currentPhaseLabel),
        currentPhaseLabel: getResolvedPhaseLabel(timerType, timerMode, prev.currentPhaseLabel),
        lastUpdatedAt: Date.now(),
      }))
    } catch (error) {
      console.error('Error resetting timer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisplayModeChange = (mode: ClockDisplayMode) => {
    setCurrentDisplayMode(mode)
    onDisplayModeChange?.(id, mode)
  }

  const handleLabelBlur = () => {
    const trimmed = editableLabel.trim()
    const nextLabel = trimmed.length > 0 ? trimmed : label
    setEditableLabel(nextLabel)
    onLabelChange?.(id, nextLabel)
  }

  const handleDeleteTimer = () => {
    setIsDeleteConfirmOpen(false)
    onDeleteTimer?.(id)
  }

  const showContinuityCatchupNote =
    editableContinueFromLastTime && editableContinueWhileAppClosed

  const addAlertCue = () => {
    setEditableAlertCues((prev) => [
      ...prev,
      { id: generateId(), thresholdPercent: 50, soundPath: '' },
    ])
  }

  const updateAlertCue = (cueId: string, updates: Partial<AlertCue>) => {
    setEditableAlertCues((prev) =>
      prev.map((cue) => (cue.id === cueId ? { ...cue, ...updates } : cue)),
    )
  }

  const removeAlertCue = (cueId: string) => {
    setEditableAlertCues((prev) => prev.filter((cue) => cue.id !== cueId))
  }

  const addMascotAnimationCue = () => {
    setEditableMascotAnimationCues((prev) => [
      ...prev,
      { id: generateId(), thresholdPercent: 50, animation: 'wiggle' },
    ])
  }

  const updateMascotAnimationCue = (
    cueId: string,
    updates: Partial<MascotAnimationCue>,
  ) => {
    setEditableMascotAnimationCues((prev) =>
      prev.map((cue) => (cue.id === cueId ? { ...cue, ...updates } : cue)),
    )
  }

  const removeMascotAnimationCue = (cueId: string) => {
    setEditableMascotAnimationCues((prev) => prev.filter((cue) => cue.id !== cueId))
  }

  const handleMascotUpload: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setEditableMascotImagePath(result)
    }
    reader.readAsDataURL(file)
  }

  const saveTimerSettings = () => {
    const cleanedAlertCues = editableAlertCues
      .filter((cue) => cue.soundPath.trim().length > 0)
      .map((cue) => ({
        ...cue,
        thresholdPercent: Math.max(1, Math.min(99, Math.round(cue.thresholdPercent))),
        soundPath: cue.soundPath.trim(),
      }))

    const continueFromLastTimeUpdate =
      editableContinueFromLastTime === (globalSettings.defaultContinueFromLastTime ?? false)
        ? undefined
        : editableContinueFromLastTime
    const continueWhileAppClosedUpdate =
      editableContinueWhileAppClosed === (globalSettings.defaultContinueWhileAppClosed ?? false)
        ? undefined
        : editableContinueWhileAppClosed
    const accentColorUpdate =
      editableAccentColor.trim().toLowerCase() === themeAccentColor.toLowerCase()
        ? undefined
        : editableAccentColor

    const timingUpdates: Partial<TimerConfig> =
      timerType === 'generic'
        ? {
            mode: editableTimerMode,
            duration: Math.max(1, Math.round(editableDurationMinutes)) * 60,
            continueFromLastTime: continueFromLastTimeUpdate,
            continueWhileAppClosed: continueWhileAppClosedUpdate,
          }
        : timerType === 'sit-stand'
          ? {
              mode: editableTimerMode,
              sitDuration: Math.max(1, Math.round(editableSitDurationMinutes)) * 60,
              standDuration: Math.max(1, Math.round(editableStandDurationMinutes)) * 60,
              autoLoop: editableAutoLoop,
              includeSitInStats: editableIncludeSitInStats,
              includeStandInStats: editableIncludeStandInStats,
              continueFromLastTime: continueFromLastTimeUpdate,
              continueWhileAppClosed: continueWhileAppClosedUpdate,
            }
          : {
              mode: editableTimerMode,
              workDuration: Math.max(1, Math.round(editableWorkDurationMinutes)) * 60,
              shortBreakDuration: Math.max(1, Math.round(editableShortBreakMinutes)) * 60,
              longBreakDuration: Math.max(1, Math.round(editableLongBreakMinutes)) * 60,
              roundsBeforeLongBreak: Math.max(1, Math.round(editablePomodoroRounds)),
              includePomodoroWorkInStats: editableIncludePomodoroWorkInStats,
              includePomodoroBreakInStats: editableIncludePomodoroBreakInStats,
              continueFromLastTime: continueFromLastTimeUpdate,
              continueWhileAppClosed: continueWhileAppClosedUpdate,
            }

    const nextUpdates: Partial<TimerConfig> = {
      displayMode: currentDisplayMode,
      ...timingUpdates,
      accentColor: accentColorUpdate,
      alertVolume: editableUseGlobalAlertVolume
        ? undefined
        : Math.max(0, Math.min(100, Math.round(editableAlertVolume))),
      useGlobalAlertCues: editableUseGlobalAlertCues,
      alertCues: cleanedAlertCues,
      useGlobalMascotSettings: editableUseGlobalMascotSettings,
      mascotImagePath: editableUseGlobalMascotSettings ? undefined : editableMascotImagePath,
      mascotSize: editableUseGlobalMascotSettings ? undefined : editableMascotSize,
      mascotScale: editableUseGlobalMascotSettings
        ? undefined
        : Number(editableMascotScale.toFixed(2)),
      mascotPosition: editableUseGlobalMascotSettings ? undefined : editableMascotPosition,
      useGlobalMascotAnimationCues: editableUseGlobalMascotCues,
      mascotAnimationCues: editableMascotAnimationCues.map((cue) => ({
        ...cue,
        thresholdPercent: Math.max(1, Math.min(99, Math.round(cue.thresholdPercent))),
      })),
    }

    onTimerConfigChange?.(id, nextUpdates)

    const didTimingChange =
      editableTimerMode !== timerMode ||
      (timerType === 'generic' &&
        Math.max(1, Math.round(editableDurationMinutes)) * 60 !== (duration ?? 10 * 60)) ||
      (timerType === 'sit-stand' &&
        (Math.max(1, Math.round(editableSitDurationMinutes)) * 60 !== (sitDuration ?? 25 * 60) ||
          Math.max(1, Math.round(editableStandDurationMinutes)) * 60 !== (standDuration ?? 5 * 60))) ||
      (timerType === 'pomodoro' &&
        (Math.max(1, Math.round(editableWorkDurationMinutes)) * 60 !== (workDuration ?? 25 * 60) ||
          Math.max(1, Math.round(editableShortBreakMinutes)) * 60 !== (shortBreakDuration ?? 5 * 60) ||
          Math.max(1, Math.round(editableLongBreakMinutes)) * 60 !== (longBreakDuration ?? 15 * 60)))

    if (didTimingChange) {
      const nextPhaseLabel = getResolvedPhaseLabel(
        timerType,
        editableTimerMode,
        state.currentPhaseLabel,
      )
      const nextTimeRemaining = getPhaseTotalSeconds(
        {
          type: timerType,
          mode: editableTimerMode,
          duration:
            timerType === 'generic'
              ? Math.max(1, Math.round(editableDurationMinutes)) * 60
              : duration,
          sitDuration:
            timerType === 'sit-stand'
              ? Math.max(1, Math.round(editableSitDurationMinutes)) * 60
              : sitDuration,
          standDuration:
            timerType === 'sit-stand'
              ? Math.max(1, Math.round(editableStandDurationMinutes)) * 60
              : standDuration,
          workDuration:
            timerType === 'pomodoro'
              ? Math.max(1, Math.round(editableWorkDurationMinutes)) * 60
              : workDuration,
          shortBreakDuration:
            timerType === 'pomodoro'
              ? Math.max(1, Math.round(editableShortBreakMinutes)) * 60
              : shortBreakDuration,
          longBreakDuration:
            timerType === 'pomodoro'
              ? Math.max(1, Math.round(editableLongBreakMinutes)) * 60
              : longBreakDuration,
        },
        nextPhaseLabel,
      )

      setState((prev) => ({
        ...prev,
        timeElapsed: 0,
        timeRemaining: nextTimeRemaining,
        currentPhaseLabel: nextPhaseLabel,
        lastUpdatedAt: Date.now(),
      }))
    }

    setIsSettingsOpen(false)
  }

  const isRunning = state.phase === 'running'
  const isPaused = state.phase === 'paused'
  const effectiveMascotImagePath =
    useGlobalMascotSettings === false ? mascotImagePath : globalSettings.mascotImagePath
  const effectiveMascotSize = useGlobalMascotSettings === false
    ? (mascotSize ?? 100)
    : (globalSettings.mascotSize ?? 100)
  const effectiveMascotScale = useGlobalMascotSettings === false
    ? (mascotScale ?? 0.65)
    : (globalSettings.mascotScale ?? 0.65)
  const effectiveMascotPosition = useGlobalMascotSettings === false
    ? (mascotPosition ?? 'top-right')
    : (globalSettings.mascotPosition ?? 'top-right')

  const liveCycleSeconds = useMemo(() => {
    if (state.phase !== 'running' && state.phase !== 'paused') {
      return 0
    }

    return Math.max(0, Math.round(state.timeElapsed || 0))
  }, [state.phase, state.timeElapsed])

  const displayedTimerStats = useMemo<TimerPeriodStats>(() => {
    if (liveCycleSeconds <= 0) {
      return timerStats
    }

    const resolvedPhaseLabel = getResolvedPhaseLabel(
      timerType,
      timerMode,
      state.currentPhaseLabel,
    )

    const targetCategory: keyof TimerPeriodStats['day'] =
      timerType === 'sit-stand'
        ? resolvedPhaseLabel === 'Standing'
          ? 'standTime'
          : 'sitTime'
        : timerType === 'pomodoro'
          ? resolvedPhaseLabel === 'Short Break' || resolvedPhaseLabel === 'Long Break'
            ? 'pomodoroBreakTime'
            : 'pomodoroWorkTime'
          : 'genericTimerTime'

    const withLiveCycle = (breakdown: TimerPeriodStats['day']): TimerPeriodStats['day'] => ({
      ...breakdown,
      totalTime: breakdown.totalTime + liveCycleSeconds,
      [targetCategory]: breakdown[targetCategory] + liveCycleSeconds,
    })

    return {
      day: withLiveCycle(timerStats.day),
      week: withLiveCycle(timerStats.week),
      month: withLiveCycle(timerStats.month),
      year: withLiveCycle(timerStats.year),
    }
  }, [liveCycleSeconds, timerStats, timerType, timerMode, state.currentPhaseLabel])

  const getPeriodValueForView = (period: keyof TimerPeriodStats, view: SplitStatsView): number => {
    const breakdown = displayedTimerStats[period]

    if (view === 'sit') return breakdown.sitTime
    if (view === 'stand') return breakdown.standTime
    if (view === 'work') return breakdown.pomodoroWorkTime
    return breakdown.pomodoroBreakTime
  }

  return (
    <div
      className={`${styles.tile} ${styles[state.phase]} ${isCompact ? styles.compactTile : ''} ${(isSettingsOpen || isDeleteConfirmOpen) ? styles.modalOpen : ''}`}
      style={{ ['--tile-accent' as string]: resolvedAccentColor || 'var(--accent-primary)' }}
    >
      <div className={styles.header}>
        <input
          className={styles.labelInput}
          value={editableLabel}
          onChange={(event) => setEditableLabel(event.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          aria-label="Timer title"
        />
        <div className={styles.headerActions}>
          <button
            className={styles.statsButton}
            onClick={() => setIsStatsFlipped((value) => !value)}
            title={isStatsFlipped ? 'Show timer' : 'Show timer stats'}
            aria-label={isStatsFlipped ? 'Show timer face' : 'Show timer stats'}
            disabled={isLoading}
          >
            ◫
          </button>
          <button
            className={styles.settingsButton}
            onClick={() => {
              setActiveSettingsTab('clock')
              setIsSettingsOpen(true)
            }}
            title="Timer settings"
            aria-label="Open timer settings"
            disabled={isLoading}
          >
            ⚙
          </button>
          <button
            className={styles.deleteButton}
            onClick={() => setIsDeleteConfirmOpen(true)}
            title="Delete timer"
            aria-label="Delete timer"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.flipContentWrap}>
        <div className={`${styles.flipContent} ${isStatsFlipped ? styles.flipContentFlipped : ''}`}>
          <div className={styles.faceFront}>
            <div className={styles.clockContainer}>
              {renderClockFace()}
              <MascotDisplay
                embedded
                imagePath={effectiveMascotImagePath}
                size={effectiveMascotSize}
                scale={effectiveMascotScale}
                position={effectiveMascotPosition}
                animationType={mascotAnimationType}
                animationNonce={mascotAnimationNonce}
              />
            </div>

            <div className={styles.controls}>
              <button
                className={`${styles.controlButton} ${styles.playPauseBtn}`}
                onClick={handlePlayPause}
                disabled={isLoading}
              >
                {isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start'}
              </button>
              <button
                className={`${styles.controlButton} ${styles.resetBtn}`}
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </button>
            </div>
          </div>

          <div className={styles.faceBack}>
            <div className={styles.statsPanel}>
              <h4 className={styles.statsTitle}>Timer Stats</h4>
              {timerType === 'generic' ? (
                <div className={styles.statsGrid}>
                  {PERIODS.map((period) => (
                    <div key={period.key} className={styles.statsCard}>
                      <span className={styles.statsLabel}>{period.label}</span>
                      <strong className={styles.statsValue}>
                        {formatTimeHuman(displayedTimerStats[period.key].totalTime)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : timerType === 'sit-stand' ? (
                <div className={styles.statsSections}>
                  <div className={styles.statsToggleRow}>
                    <button
                      className={`${styles.statsToggleButton} ${splitStatsView === 'sit' ? styles.statsToggleButtonActive : ''}`}
                      onClick={() => setSplitStatsView('sit')}
                      type="button"
                    >
                      Sit
                    </button>
                    <button
                      className={`${styles.statsToggleButton} ${splitStatsView === 'stand' ? styles.statsToggleButtonActive : ''}`}
                      onClick={() => setSplitStatsView('stand')}
                      type="button"
                    >
                      Stand
                    </button>
                  </div>
                  <div className={styles.statsGrid}>
                    {PERIODS.map((period) => (
                      <div key={`${splitStatsView}-${period.key}`} className={styles.statsCard}>
                        <span className={styles.statsLabel}>{period.label}</span>
                        <strong className={styles.statsValue}>
                          {formatTimeHuman(getPeriodValueForView(period.key, splitStatsView))}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.statsSections}>
                  <div className={styles.statsToggleRow}>
                    <button
                      className={`${styles.statsToggleButton} ${splitStatsView === 'work' ? styles.statsToggleButtonActive : ''}`}
                      onClick={() => setSplitStatsView('work')}
                      type="button"
                    >
                      Work
                    </button>
                    <button
                      className={`${styles.statsToggleButton} ${splitStatsView === 'break' ? styles.statsToggleButtonActive : ''}`}
                      onClick={() => setSplitStatsView('break')}
                      type="button"
                    >
                      Break
                    </button>
                  </div>
                  <div className={styles.statsGrid}>
                    {PERIODS.map((period) => (
                      <div key={`${splitStatsView}-${period.key}`} className={styles.statsCard}>
                        <span className={styles.statsLabel}>{period.label}</span>
                        <strong className={styles.statsValue}>
                          {formatTimeHuman(getPeriodValueForView(period.key, splitStatsView))}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isStatsLoading && <p className={styles.statsHint}>Loading stats…</p>}
            </div>
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <div className={styles.settingsOverlay} onClick={() => setIsSettingsOpen(false)}>
          <div className={styles.settingsModal} onClick={(event) => event.stopPropagation()}>
            <h4 className={styles.settingsTitle}>Timer Settings</h4>
            <div className={styles.settingsTabs}>
              <button
                className={`${styles.settingsTabButton} ${activeSettingsTab === 'clock' ? styles.settingsTabButtonActive : ''}`}
                onClick={() => setActiveSettingsTab('clock')}
              >
                Clock Settings
              </button>
              <button
                className={`${styles.settingsTabButton} ${activeSettingsTab === 'overrides' ? styles.settingsTabButtonActive : ''}`}
                onClick={() => setActiveSettingsTab('overrides')}
              >
                Global Overrides
              </button>
            </div>

            {activeSettingsTab === 'clock' ? (
              <>
                <section className={styles.settingsSection}>
                  <h5 className={styles.settingsSectionTitle}>Display</h5>
                  <label className={styles.settingsField}>
                    Display Mode
                    <select
                      className={styles.settingsSelect}
                      value={currentDisplayMode}
                      onChange={(event) =>
                        handleDisplayModeChange(event.target.value as ClockDisplayMode)
                      }
                    >
                      {DISPLAY_MODE_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>
                          {DISPLAY_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.settingsField}>
                    Accent Color
                    <input
                      className={styles.settingsColorInput}
                      type="color"
                      value={editableAccentColor}
                      onChange={(event) => setEditableAccentColor(event.target.value)}
                    />
                  </label>
                </section>

                <section className={styles.settingsSection}>
                  <h5 className={styles.settingsSectionTitle}>Timer Rules</h5>
                  <label className={styles.settingsField}>
                    Mode
                    <select
                      className={styles.settingsSelect}
                      value={editableTimerMode}
                      onChange={(event) => setEditableTimerMode(event.target.value as TimerConfig['mode'])}
                    >
                      <option value="countdown">Countdown</option>
                      <option value="countup">Count Up</option>
                    </select>
                  </label>

                  {timerType === 'generic' && (
                    <>
                      <label className={styles.settingsField}>
                        Duration (minutes)
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editableDurationMinutes}
                          onChange={(event) => setEditableDurationMinutes(Number(event.target.value))}
                        />
                      </label>
                    </>
                  )}

                  {timerType === 'sit-stand' && (
                    <>
                      <label className={styles.settingsField}>
                        Sit Duration (minutes)
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editableSitDurationMinutes}
                          onChange={(event) => setEditableSitDurationMinutes(Number(event.target.value))}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Stand Duration (minutes)
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editableStandDurationMinutes}
                          onChange={(event) => setEditableStandDurationMinutes(Number(event.target.value))}
                        />
                      </label>
                      <label className={styles.settingsToggle}>
                        <input
                          type="checkbox"
                          checked={editableAutoLoop}
                          onChange={(event) => setEditableAutoLoop(event.target.checked)}
                        />
                        Auto loop between sit and stand
                      </label>
                      <div className={styles.settingsSubsection}>
                        <h6 className={styles.settingsSubsectionTitle}>Stats Tracking</h6>
                        <label className={styles.settingsOptionRow}>
                          <input
                            type="checkbox"
                            checked={editableIncludeSitInStats}
                            onChange={(event) => setEditableIncludeSitInStats(event.target.checked)}
                          />
                          <span className={styles.settingsOptionText}>
                            <span className={styles.settingsOptionTitle}>Track sitting time</span>
                          </span>
                        </label>
                        <label className={styles.settingsOptionRow}>
                          <input
                            type="checkbox"
                            checked={editableIncludeStandInStats}
                            onChange={(event) => setEditableIncludeStandInStats(event.target.checked)}
                          />
                          <span className={styles.settingsOptionText}>
                            <span className={styles.settingsOptionTitle}>Track standing time</span>
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  {timerType === 'pomodoro' && (
                    <>
                      <label className={styles.settingsField}>
                        Work Duration (minutes)
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editableWorkDurationMinutes}
                          onChange={(event) => setEditableWorkDurationMinutes(Number(event.target.value))}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Short Break (minutes)
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editableShortBreakMinutes}
                          onChange={(event) => setEditableShortBreakMinutes(Number(event.target.value))}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Long Break (minutes)
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editableLongBreakMinutes}
                          onChange={(event) => setEditableLongBreakMinutes(Number(event.target.value))}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Rounds Before Long Break
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          value={editablePomodoroRounds}
                          onChange={(event) => setEditablePomodoroRounds(Number(event.target.value))}
                        />
                      </label>
                      <div className={styles.settingsSubsection}>
                        <h6 className={styles.settingsSubsectionTitle}>Stats Tracking</h6>
                        <label className={styles.settingsOptionRow}>
                          <input
                            type="checkbox"
                            checked={editableIncludePomodoroWorkInStats}
                            onChange={(event) => setEditableIncludePomodoroWorkInStats(event.target.checked)}
                          />
                          <span className={styles.settingsOptionText}>
                            <span className={styles.settingsOptionTitle}>Track work time</span>
                          </span>
                        </label>
                        <label className={styles.settingsOptionRow}>
                          <input
                            type="checkbox"
                            checked={editableIncludePomodoroBreakInStats}
                            onChange={(event) => setEditableIncludePomodoroBreakInStats(event.target.checked)}
                          />
                          <span className={styles.settingsOptionText}>
                            <span className={styles.settingsOptionTitle}>Track break time</span>
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  <div className={styles.settingsDivider} />
                  <div className={styles.settingsSubsection}>
                    <h6 className={styles.settingsSubsectionTitle}>Timer Continuity</h6>
                    <label className={styles.settingsOptionRow}>
                      <input
                        type="checkbox"
                        checked={editableContinueFromLastTime}
                        onChange={(event) => setEditableContinueFromLastTime(event.target.checked)}
                      />
                      <span className={styles.settingsOptionText}>
                        <span className={styles.settingsOptionTitle}>Restore saved time</span>
                        <span className={styles.settingsOptionDescription}>Reopen at the last saved time.</span>
                      </span>
                    </label>
                    <label className={styles.settingsOptionRow}>
                      <input
                        type="checkbox"
                        checked={editableContinueWhileAppClosed}
                        onChange={(event) => setEditableContinueWhileAppClosed(event.target.checked)}
                      />
                      <span className={styles.settingsOptionText}>
                        <span className={styles.settingsOptionTitle}>Keep running while closed</span>
                        <span className={styles.settingsOptionDescription}>Catch up based on real time.</span>
                      </span>
                    </label>
                    {showContinuityCatchupNote && (
                      <p className={styles.settingsInfoPill}>
                        Paused timers restore. Running timers catch up.
                      </p>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className={styles.settingsSection}>
                  <h5 className={styles.settingsSectionTitle}>Alerts</h5>
                  <label className={styles.settingsToggle}>
                    <input
                      type="checkbox"
                      checked={editableUseGlobalAlertVolume}
                      onChange={(event) => setEditableUseGlobalAlertVolume(event.target.checked)}
                    />
                    Use global alert volume
                  </label>
                  {!editableUseGlobalAlertVolume && (
                    <label className={styles.settingsField}>
                      Alert Volume
                      <input
                        className={styles.settingsRangeInput}
                        type="range"
                        min={0}
                        max={100}
                        value={editableAlertVolume}
                        onChange={(event) => setEditableAlertVolume(Number(event.target.value))}
                      />
                    </label>
                  )}
                  <label className={styles.settingsToggle}>
                    <input
                      type="checkbox"
                      checked={editableUseGlobalAlertCues}
                      onChange={(event) => setEditableUseGlobalAlertCues(event.target.checked)}
                    />
                    Use global alert sounds
                  </label>
                  {!editableUseGlobalAlertCues && (
                    <div className={styles.alertCueList}>
                      {editableAlertCues.map((cue) => (
                        <div key={cue.id} className={styles.alertCueRow}>
                          <input
                            className={styles.settingsNumberInput}
                            type="number"
                            min={1}
                            max={99}
                            value={cue.thresholdPercent}
                            onChange={(event) =>
                              updateAlertCue(cue.id, { thresholdPercent: Number(event.target.value) })
                            }
                          />
                          <span className={styles.percentLabel}>%</span>
                          <input
                            className={styles.settingsInput}
                            type="text"
                            placeholder="Sound file path"
                            value={cue.soundPath}
                            onChange={(event) =>
                              updateAlertCue(cue.id, { soundPath: event.target.value })
                            }
                          />
                          <button
                            className={styles.removeCueButton}
                            onClick={() => removeAlertCue(cue.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button className={styles.addCueButton} onClick={addAlertCue}>
                        + Add Alert Cue
                      </button>
                    </div>
                  )}
                </section>

                <section className={styles.settingsSection}>
                  <h5 className={styles.settingsSectionTitle}>Mascot</h5>
                  <label className={styles.settingsToggle}>
                    <input
                      type="checkbox"
                      checked={editableUseGlobalMascotSettings}
                      onChange={(event) => setEditableUseGlobalMascotSettings(event.target.checked)}
                    />
                    Use global mascot image, size, and position
                  </label>
                  {!editableUseGlobalMascotSettings && (
                    <>
                      <label className={styles.settingsField}>
                        Mascot Image
                        <input
                          className={styles.settingsFileInput}
                          type="file"
                          accept="image/*"
                          onChange={handleMascotUpload}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Mascot Size
                        <input
                          className={styles.settingsRangeInput}
                          type="range"
                          min={60}
                          max={220}
                          value={editableMascotSize}
                          onChange={(event) => setEditableMascotSize(Number(event.target.value))}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Mascot Scale
                        <input
                          className={styles.settingsRangeInput}
                          type="range"
                          min={30}
                          max={120}
                          value={Math.round(editableMascotScale * 100)}
                          onChange={(event) => setEditableMascotScale(Number(event.target.value) / 100)}
                        />
                      </label>
                      <label className={styles.settingsField}>
                        Mascot Position
                        <select
                          className={styles.settingsSelect}
                          value={editableMascotPosition}
                          onChange={(event) =>
                            setEditableMascotPosition(
                              event.target.value as
                                | 'top-left'
                                | 'top-right'
                                | 'bottom-left'
                                | 'bottom-right',
                            )
                          }
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label className={styles.settingsToggle}>
                    <input
                      type="checkbox"
                      checked={editableUseGlobalMascotCues}
                      onChange={(event) => setEditableUseGlobalMascotCues(event.target.checked)}
                    />
                    Use global mascot animations
                  </label>
                  {!editableUseGlobalMascotCues && (
                    <div className={styles.alertCueList}>
                      {editableMascotAnimationCues.map((cue) => (
                        <div key={cue.id} className={styles.alertCueRow}>
                          <input
                            className={styles.settingsNumberInput}
                            type="number"
                            min={1}
                            max={99}
                            value={cue.thresholdPercent}
                            onChange={(event) =>
                              updateMascotAnimationCue(cue.id, {
                                thresholdPercent: Number(event.target.value),
                              })
                            }
                          />
                          <span className={styles.percentLabel}>%</span>
                          <select
                            className={styles.settingsSelect}
                            value={cue.animation}
                            onChange={(event) =>
                              updateMascotAnimationCue(cue.id, {
                                animation: event.target.value as MascotAnimationType,
                              })
                            }
                          >
                            {mascotAnimationTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          <button
                            className={styles.removeCueButton}
                            onClick={() => removeMascotAnimationCue(cue.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button className={styles.addCueButton} onClick={addMascotAnimationCue}>
                        + Add Mascot Cue
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            <div className={styles.settingsActions}>
              <button className={styles.settingsCloseButton} onClick={saveTimerSettings}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className={styles.settingsOverlay} onClick={() => setIsDeleteConfirmOpen(false)}>
          <div
            className={styles.confirmModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete timer confirmation"
          >
            <h4 className={styles.settingsTitle}>Delete Timer?</h4>
            <p className={styles.settingsHelpText}>
              This will permanently remove {editableLabel || 'this timer'}.
            </p>
            <div className={styles.settingsActions}>
              <button
                className={styles.settingsDeleteButton}
                onClick={handleDeleteTimer}
              >
                Delete
              </button>
              <button
                className={styles.settingsCloseButton}
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {state.phase === 'paused' && !isStatsFlipped && (
        <div className={styles.badge}>⏸ PAUSED</div>
      )}
    </div>
  )
}

export default TimerTile
