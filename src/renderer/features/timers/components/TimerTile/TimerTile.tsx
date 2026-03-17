/**
 * TimerTile component - individual timer display with all clock modes
 */

import React, { useEffect, useState } from 'react'
import { createTimerStore } from '../../store/timerStore'
import { DigitalClock } from '../ClockFaces/DigitalClock'
import { AnalogClock } from '../ClockFaces/AnalogClock'
import { RingClock } from '../ClockFaces/RingClock'
import { FlipClock } from '../ClockFaces/FlipClock'
import { MascotDisplay } from '../../../../components/MascotDisplay/MascotDisplay'
import { TimerActions } from './TimerActions'
import {
  TimerSplitStatsSection,
  type SplitStatsOption,
  type SplitStatsView,
} from './TimerSplitStatsSection'
import { useGlobalStore } from '../../../../store/globalStore'
import { useIpcSubscription } from '../../../../hooks/useIpcSubscription'
import { clampPercent, minutesToSeconds, sanitizePositiveInt } from '../../utils/timerMath'
import { getPhaseTotalSeconds, getResolvedPhaseLabel } from '../../utils/timerPhase'
import { fileToDataUrl } from '../../../../utils/fileToDataUrl'
import { getPlayPauseLabel } from '../../utils/timerControls'
import { getPeriodValueForSplitView } from '../../utils/timerStats'
import styles from './TimerTile.module.css'
import { formatTimeHuman, generateId } from '@shared/utils'
import {
  DEFAULT_GENERIC_DURATION,
  DEFAULT_SIT_DURATION,
  DEFAULT_STAND_DURATION,
  DEFAULT_POMODORO_WORK,
  DEFAULT_POMODORO_SHORT_BREAK,
  DEFAULT_POMODORO_LONG_BREAK,
  DEFAULT_POMODORO_ROUNDS_BEFORE_LONG,
  DEFAULT_MASCOT_SIZE,
} from '@shared/constants'
import type {
  TimerState,
  ClockDisplayMode,
  AlertCue,
  TimerConfig,
  MascotAnimationCue,
  MascotAnimationType,
  TimerPeriodStats,
} from '../../../../../types/index'

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
const SIT_STAND_STATS_OPTIONS: SplitStatsOption[] = [
  { key: 'sit', label: 'Sit' },
  { key: 'stand', label: 'Stand' },
]
const POMODORO_STATS_OPTIONS: SplitStatsOption[] = [
  { key: 'work', label: 'Work' },
  { key: 'break', label: 'Break' },
]

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
  const [editableDurationMinutes, setEditableDurationMinutes] = useState(
    Math.round((duration ?? DEFAULT_GENERIC_DURATION) / 60),
  )
  const [editableSitDurationMinutes, setEditableSitDurationMinutes] = useState(
    Math.round((sitDuration ?? DEFAULT_SIT_DURATION) / 60),
  )
  const [editableStandDurationMinutes, setEditableStandDurationMinutes] = useState(
    Math.round((standDuration ?? DEFAULT_STAND_DURATION) / 60),
  )
  const [editableAutoLoop, setEditableAutoLoop] = useState(autoLoop)
  const [editableContinueFromLastTime, setEditableContinueFromLastTime] =
    useState(false)
  const [editableContinueWhileAppClosed, setEditableContinueWhileAppClosed] =
    useState(false)
  const [editableWorkDurationMinutes, setEditableWorkDurationMinutes] = useState(
    Math.round((workDuration ?? DEFAULT_POMODORO_WORK) / 60),
  )
  const [editableShortBreakMinutes, setEditableShortBreakMinutes] = useState(
    Math.round((shortBreakDuration ?? DEFAULT_POMODORO_SHORT_BREAK) / 60),
  )
  const [editableLongBreakMinutes, setEditableLongBreakMinutes] = useState(
    Math.round((longBreakDuration ?? DEFAULT_POMODORO_LONG_BREAK) / 60),
  )
  const [editablePomodoroRounds, setEditablePomodoroRounds] = useState(
    roundsBeforeLongBreak ?? DEFAULT_POMODORO_ROUNDS_BEFORE_LONG,
  )
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
    mascotSize ?? (globalSettings.mascotSize ?? DEFAULT_MASCOT_SIZE),
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
  useIpcSubscription(() => {
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

    return window.electronAPI?.onTimerTick(handleTimerTick)
  }, [id])

  useEffect(() => {
    setEditableLabel(label)
  }, [label])

  useEffect(() => {
    setEditableTimerMode(timerMode)
  }, [timerMode])

  useEffect(() => {
    setEditableDurationMinutes(Math.round((duration ?? DEFAULT_GENERIC_DURATION) / 60))
  }, [duration])

  useEffect(() => {
    setEditableSitDurationMinutes(Math.round((sitDuration ?? DEFAULT_SIT_DURATION) / 60))
  }, [sitDuration])

  useEffect(() => {
    setEditableStandDurationMinutes(Math.round((standDuration ?? DEFAULT_STAND_DURATION) / 60))
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
    setEditableWorkDurationMinutes(Math.round((workDuration ?? DEFAULT_POMODORO_WORK) / 60))
  }, [workDuration])

  useEffect(() => {
    setEditableShortBreakMinutes(Math.round((shortBreakDuration ?? DEFAULT_POMODORO_SHORT_BREAK) / 60))
  }, [shortBreakDuration])

  useEffect(() => {
    setEditableLongBreakMinutes(Math.round((longBreakDuration ?? DEFAULT_POMODORO_LONG_BREAK) / 60))
  }, [longBreakDuration])

  useEffect(() => {
    setEditablePomodoroRounds(roundsBeforeLongBreak ?? DEFAULT_POMODORO_ROUNDS_BEFORE_LONG)
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

  useIpcSubscription(() => {
    const handleMascotAnimate = (data: { id?: string; animation?: MascotAnimationType }) => {
      if (data?.id !== id || !data.animation) return
      setMascotAnimationType(data.animation)
      setMascotAnimationNonce((value) => value + 1)
    }

    return window.electronAPI?.onMascotAnimate(handleMascotAnimate)
  }, [id])

  useIpcSubscription(() => {
    const handleTimerStateUpdate = (data: { states?: Record<string, TimerState> }) => {
      const nextState = data?.states?.[id]
      if (!nextState) return
      setState(nextState)
    }

    return window.electronAPI?.onTimerStateUpdate(handleTimerStateUpdate)
  }, [id])

  useEffect(() => {
    let isDisposed = false

    const hydrateTimerState = async () => {
      try {
        const result = await window.electronAPI?.getTimerState(id)
        const nextState = result?.success ? result.data : null
        if (!isDisposed && nextState) {
          setState(nextState)
        }
      } catch {
        // Ignore transient startup IPC issues.
      }
    }

    hydrateTimerState()

    return () => {
      isDisposed = true
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
    if (isCompact) {
      setIsStatsFlipped(false)
    }
  }, [isCompact])

  useIpcSubscription(() => {
    const handleStatsUpdate = () => {
      if (!isStatsFlipped) return
      loadTimerStats()
    }

    return window.electronAPI?.onStatsUpdate(handleStatsUpdate)
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
    setEditableMascotSize(mascotSize ?? (globalSettings.mascotSize ?? DEFAULT_MASCOT_SIZE))
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

  const runTimerAction = async (action: () => Promise<void>) => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayPause = async () => {
    await runTimerAction(async () => {
      try {
        if (state.phase === 'running') {
          await window.electronAPI?.pauseTimer(id)
          setState((prev) => ({ ...prev, phase: 'paused' }))
          return
        }

        if (state.phase === 'paused') {
          await window.electronAPI?.resumeTimer(id)
          setState((prev) => ({ ...prev, phase: 'running' }))
          return
        }

        await window.electronAPI?.startTimer(id)
        setState((prev) => ({ ...prev, phase: 'running' }))
      } catch (error) {
        console.error('Error toggling timer:', error)
      }
    })
  }

  const handleReset = async () => {
    await runTimerAction(async () => {
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

        if (isStatsFlipped) {
          await loadTimerStats()
          setTimeout(() => {
            void loadTimerStats()
          }, 200)
        }
      } catch (error) {
        console.error('Error resetting timer:', error)
      }
    })
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

  const browseAlertCueSound = async (cueId: string) => {
    try {
      const result = await window.electronAPI?.pickSoundFile()
      if (!result?.success || !result.filePath) return
      updateAlertCue(cueId, { soundPath: result.filePath })
    } catch (error) {
      console.error('Error selecting alert sound file:', error)
    }
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

    fileToDataUrl(file)
      .then((result) => setEditableMascotImagePath(result))
      .catch((error) => console.error('Error reading mascot file:', error))
  }

  const saveTimerSettings = () => {
    const genericDurationSeconds = minutesToSeconds(editableDurationMinutes, 25)
    const sitDurationSeconds = minutesToSeconds(editableSitDurationMinutes, 25)
    const standDurationSeconds = minutesToSeconds(editableStandDurationMinutes, 5)
    const workDurationSeconds = minutesToSeconds(editableWorkDurationMinutes, 25)
    const shortBreakSeconds = minutesToSeconds(editableShortBreakMinutes, 5)
    const longBreakSeconds = minutesToSeconds(editableLongBreakMinutes, 15)
    const pomodoroRounds = sanitizePositiveInt(editablePomodoroRounds, 4)

    const cleanedAlertCues = editableAlertCues
      .filter((cue) => cue.soundPath.trim().length > 0)
      .map((cue) => ({
        ...cue,
        thresholdPercent: clampPercent(cue.thresholdPercent, 1, 99),
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
            duration: genericDurationSeconds,
            continueFromLastTime: continueFromLastTimeUpdate,
            continueWhileAppClosed: continueWhileAppClosedUpdate,
          }
        : timerType === 'sit-stand'
          ? {
              mode: editableTimerMode,
              sitDuration: sitDurationSeconds,
              standDuration: standDurationSeconds,
              autoLoop: editableAutoLoop,
              includeSitInStats: editableIncludeSitInStats,
              includeStandInStats: editableIncludeStandInStats,
              continueFromLastTime: continueFromLastTimeUpdate,
              continueWhileAppClosed: continueWhileAppClosedUpdate,
            }
          : {
              mode: editableTimerMode,
              workDuration: workDurationSeconds,
              shortBreakDuration: shortBreakSeconds,
              longBreakDuration: longBreakSeconds,
              roundsBeforeLongBreak: pomodoroRounds,
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
        : clampPercent(editableAlertVolume),
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
        thresholdPercent: clampPercent(cue.thresholdPercent, 1, 99),
      })),
    }

    onTimerConfigChange?.(id, nextUpdates)

    const didTimingChange =
      editableTimerMode !== timerMode ||
      (timerType === 'generic' &&
        genericDurationSeconds !== (duration ?? 10 * 60)) ||
      (timerType === 'sit-stand' &&
        (sitDurationSeconds !== (sitDuration ?? 25 * 60) ||
          standDurationSeconds !== (standDuration ?? 5 * 60))) ||
      (timerType === 'pomodoro' &&
        (workDurationSeconds !== (workDuration ?? 25 * 60) ||
          shortBreakSeconds !== (shortBreakDuration ?? 5 * 60) ||
          longBreakSeconds !== (longBreakDuration ?? 15 * 60)))

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
              ? genericDurationSeconds
              : duration,
          sitDuration:
            timerType === 'sit-stand'
              ? sitDurationSeconds
              : sitDuration,
          standDuration:
            timerType === 'sit-stand'
              ? standDurationSeconds
              : standDuration,
          workDuration:
            timerType === 'pomodoro'
              ? workDurationSeconds
              : workDuration,
          shortBreakDuration:
            timerType === 'pomodoro'
              ? shortBreakSeconds
              : shortBreakDuration,
          longBreakDuration:
            timerType === 'pomodoro'
              ? longBreakSeconds
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

  const playPauseLabel = getPlayPauseLabel(state.phase)
  const effectiveMascotImagePath =
    useGlobalMascotSettings === false ? mascotImagePath : globalSettings.mascotImagePath
  const effectiveMascotSize = useGlobalMascotSettings === false
    ? (mascotSize ?? DEFAULT_MASCOT_SIZE)
    : (globalSettings.mascotSize ?? DEFAULT_MASCOT_SIZE)
  const effectiveMascotScale = useGlobalMascotSettings === false
    ? (mascotScale ?? 0.65)
    : (globalSettings.mascotScale ?? 0.65)
  const effectiveMascotPosition = useGlobalMascotSettings === false
    ? (mascotPosition ?? 'top-right')
    : (globalSettings.mascotPosition ?? 'top-right')

  const displayedTimerStats = timerStats

  const getPeriodValueForView = (period: keyof TimerPeriodStats, view: SplitStatsView): number => {
    return getPeriodValueForSplitView(displayedTimerStats, period, view)
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

            <TimerActions
              playPauseLabel={playPauseLabel}
              isLoading={isLoading}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
            />
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
                <TimerSplitStatsSection
                  options={SIT_STAND_STATS_OPTIONS}
                  splitStatsView={splitStatsView}
                  setSplitStatsView={setSplitStatsView}
                  periods={PERIODS}
                  getPeriodValueForView={getPeriodValueForView}
                />
              ) : (
                <TimerSplitStatsSection
                  options={POMODORO_STATS_OPTIONS}
                  splitStatsView={splitStatsView}
                  setSplitStatsView={setSplitStatsView}
                  periods={PERIODS}
                  getPeriodValueForView={getPeriodValueForView}
                />
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
                        <div key={cue.id} className={styles.alertCueCard}>
                          <div className={styles.alertCueThresholdRow}>
                            <span className={styles.alertCueThresholdLabel}>Sound will play when timer is at</span>
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
                          </div>
                          <input
                            className={styles.settingsInput}
                            type="text"
                            placeholder="Sound file path"
                            value={cue.soundPath}
                            onChange={(event) =>
                              updateAlertCue(cue.id, { soundPath: event.target.value })
                            }
                          />
                          <div className={styles.alertCueActionsRow}>
                            <button
                              type="button"
                              className={styles.browseCueButton}
                              onClick={() => browseAlertCueSound(cue.id)}
                            >
                              Browse
                            </button>
                            <button
                              type="button"
                              className={styles.removeCueButton}
                              onClick={() => removeAlertCue(cue.id)}
                            >
                              Remove
                            </button>
                          </div>
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
                      <div className={styles.settingsField}>
                        Mascot Image
                        <div className={styles.mascotUploadContainer}>
                          {editableMascotImagePath && (
                            <div className={styles.mascotPreviewWrapper}>
                              <img
                                src={editableMascotImagePath}
                                alt="Current mascot"
                                className={styles.mascotPreview}
                              />
                              <button
                                className={styles.clearButton}
                                onClick={() => setEditableMascotImagePath('')}
                              >
                                Clear
                              </button>
                            </div>
                          )}
                          <label className={styles.fileInputLabel}>
                            <input
                              className={styles.settingsFileInput}
                              type="file"
                              accept="image/*"
                              onChange={handleMascotUpload}
                            />
                            <span className={styles.fileInputButton}>
                              {editableMascotImagePath ? 'Change Mascot' : 'Choose File'}
                            </span>
                          </label>
                        </div>
                      </div>
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

    </div>
  )
}

export default TimerTile
