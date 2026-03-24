import { useEffect, useState, type ChangeEventHandler, type Dispatch, type SetStateAction } from 'react'
import { useGlobalStore } from '../../../store/globalStore'
import { fileToDataUrl } from '../../../utils/fileToDataUrl'
import { clampPercent, minutesToSeconds, sanitizePositiveInt } from '../utils/timerMath'
import { getPhaseTotalSeconds, getResolvedPhaseLabel } from '@shared/timerPhase'
import { DEFAULT_POMODORO_ROUNDS, DEFAULT_TIMER_SECONDS } from '@shared/timerDefaults'
import { generateId } from '@shared/utils'
import { DEFAULT_ALERT_VOLUME, DEFAULT_MASCOT_SIZE } from '@shared/constants'
import type {
  AlertCue,
  ClockDisplayMode,
  MascotAnimationCue,
  MascotAnimationType,
  TimerConfig,
  TimerState,
} from '../../../../types'

const DISPLAY_MODE_OPTIONS: Array<Exclude<ClockDisplayMode, 'minimal'>> = ['digital', 'analog', 'ring', 'flip']
const DISPLAY_MODE_LABELS: Record<Exclude<ClockDisplayMode, 'minimal'>, string> = { digital: 'Digital', analog: 'Analog', ring: 'Ring', flip: 'Flip' }

const EMPTY_ALERT_CUES: AlertCue[] = []
const EMPTY_MASCOT_CUES: MascotAnimationCue[] = []
const MASCOT_ANIMATION_TYPES: MascotAnimationType[] = ['shake', 'wiggle', 'bounce']

const appendWithGeneratedId = <T extends { id: string }>(
  setter: Dispatch<SetStateAction<T[]>>,
  createItem: (id: string) => T,
) => {
  setter((prev) => [...prev, createItem(generateId())])
}

const updateById = <T extends { id: string }>(
  setter: Dispatch<SetStateAction<T[]>>,
  targetId: string,
  updates: Partial<T>,
) => {
  setter((prev) => prev.map((item) => (item.id === targetId ? { ...item, ...updates } : item)))
}

const removeById = <T extends { id: string }>(
  setter: Dispatch<SetStateAction<T[]>>,
  targetId: string,
) => {
  setter((prev) => prev.filter((item) => item.id !== targetId))
}

const getThemeAccentColor = () => {
  if (typeof window === 'undefined') {
    return '#d4a574'
  }

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-primary')
    .trim()

  return accent || '#d4a574'
}

type MascotPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type SettingsTab = 'general' | 'alerts' | 'mascot'

interface UseTimerTileSettingsParams {
  id: string
  timerType: TimerConfig['type']
  timerMode: TimerConfig['mode']
  displayMode: ClockDisplayMode
  duration?: number
  sitDuration?: number
  standDuration?: number
  autoAdvanceStages?: boolean
  autoLoop?: boolean
  continueFromLastTime?: boolean
  continueWhileAppClosed?: boolean
  workDuration?: number
  shortBreakDuration?: number
  longBreakDuration?: number
  roundsBeforeLongBreak?: number
  borderColor?: string
  alertVolume?: number
  alertCues?: AlertCue[]
  useGlobalAlertCues: boolean
  showTimerNotifications?: boolean
  flashTaskbar?: boolean
  mascotImagePath?: string
  mascotSize?: number
  mascotScale?: number
  mascotPosition?: MascotPosition
  useGlobalMascotSettings: boolean
  mascotAnimationCues?: MascotAnimationCue[]
  useGlobalMascotAnimationCues: boolean
  currentPhaseLabel?: string
  setState: Dispatch<SetStateAction<TimerState>>
  onDisplayModeChange?: (id: string, mode: ClockDisplayMode) => void
  onTimerConfigChange?: (id: string, updates: Partial<TimerConfig>) => void
}

export const useTimerTileSettings = ({
  id,
  timerType,
  timerMode,
  displayMode,
  duration,
  sitDuration,
  standDuration,
  autoAdvanceStages,
  autoLoop,
  continueFromLastTime,
  continueWhileAppClosed,
  workDuration,
  shortBreakDuration,
  longBreakDuration,
  roundsBeforeLongBreak,
  borderColor,
  alertVolume,
  alertCues,
  useGlobalAlertCues,
  showTimerNotifications,
  flashTaskbar,
  mascotImagePath,
  mascotSize,
  mascotScale,
  mascotPosition,
  useGlobalMascotSettings,
  mascotAnimationCues,
  useGlobalMascotAnimationCues,
  currentPhaseLabel,
  setState,
  onDisplayModeChange,
  onTimerConfigChange,
}: UseTimerTileSettingsParams) => {
  const globalSettings = useGlobalStore((store) => store.settings)
  const themeAccentColor = getThemeAccentColor()
  const resolvedBorderColor = borderColor

  const [currentDisplayMode, setCurrentDisplayMode] = useState<ClockDisplayMode>(
    displayMode === 'minimal' ? 'digital' : displayMode,
  )
  const [editableTimerMode, setEditableTimerMode] = useState(timerMode)
  const [editableDurationMinutes, setEditableDurationMinutes] = useState(
    Math.round((duration ?? DEFAULT_TIMER_SECONDS.generic) / 60),
  )
  const [editableSitDurationMinutes, setEditableSitDurationMinutes] = useState(
    Math.round((sitDuration ?? DEFAULT_TIMER_SECONDS.sit) / 60),
  )
  const [editableStandDurationMinutes, setEditableStandDurationMinutes] = useState(
    Math.round((standDuration ?? DEFAULT_TIMER_SECONDS.stand) / 60),
  )
  const resolvedAutoAdvanceStages =
    autoAdvanceStages ?? autoLoop ?? (globalSettings.defaultAutoAdvanceStages ?? true)
  const [editableAutoAdvanceStages, setEditableAutoAdvanceStages] = useState(
    resolvedAutoAdvanceStages,
  )
  const [editableContinueFromLastTime, setEditableContinueFromLastTime] = useState(false)
  const [editableContinueWhileAppClosed, setEditableContinueWhileAppClosed] = useState(false)
  const [editableWorkDurationMinutes, setEditableWorkDurationMinutes] = useState(
    Math.round((workDuration ?? DEFAULT_TIMER_SECONDS.work) / 60),
  )
  const [editableShortBreakMinutes, setEditableShortBreakMinutes] = useState(
    Math.round((shortBreakDuration ?? DEFAULT_TIMER_SECONDS.shortBreak) / 60),
  )
  const [editableLongBreakMinutes, setEditableLongBreakMinutes] = useState(
    Math.round((longBreakDuration ?? DEFAULT_TIMER_SECONDS.longBreak) / 60),
  )
  const [editablePomodoroRounds, setEditablePomodoroRounds] = useState(
    roundsBeforeLongBreak ?? DEFAULT_POMODORO_ROUNDS,
  )
  const [editableBorderColor, setEditableBorderColor] = useState(
    borderColor ?? themeAccentColor,
  )
  const [editableUseGlobalAlertVolume, setEditableUseGlobalAlertVolume] = useState(
    alertVolume === undefined,
  )
  const [editableAlertVolume, setEditableAlertVolume] = useState(
    alertVolume ?? (globalSettings.defaultAlertVolume ?? DEFAULT_ALERT_VOLUME),
  )
  const [editableUseGlobalAlertCues, setEditableUseGlobalAlertCues] = useState(useGlobalAlertCues)
  const resolvedAlertCues = alertCues ?? EMPTY_ALERT_CUES
  const [editableAlertCues, setEditableAlertCues] = useState<AlertCue[]>(resolvedAlertCues)
  const [editableUseGlobalTimerNotifications, setEditableUseGlobalTimerNotifications] = useState(
    showTimerNotifications === undefined,
  )
  const [editableShowTimerNotifications, setEditableShowTimerNotifications] = useState(
    showTimerNotifications ?? (globalSettings.defaultShowTimerNotifications ?? true),
  )
  const [editableUseGlobalFlashTaskbar, setEditableUseGlobalFlashTaskbar] = useState(
    flashTaskbar === undefined,
  )
  const [editableFlashTaskbar, setEditableFlashTaskbar] = useState(
    flashTaskbar ?? (globalSettings.defaultFlashTaskbar ?? true),
  )
  const [editableUseGlobalMascotSettings, setEditableUseGlobalMascotSettings] =
    useState(useGlobalMascotSettings)
  const [editableMascotImagePath, setEditableMascotImagePath] = useState(mascotImagePath || '')
  const [editableMascotSize, setEditableMascotSize] = useState(
    mascotSize ?? (globalSettings.mascotSize ?? DEFAULT_MASCOT_SIZE),
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('general')

  useEffect(() => {
    setEditableTimerMode(timerMode)
    setEditableDurationMinutes(Math.round((duration ?? DEFAULT_TIMER_SECONDS.generic) / 60))
    setEditableSitDurationMinutes(Math.round((sitDuration ?? DEFAULT_TIMER_SECONDS.sit) / 60))
    setEditableStandDurationMinutes(Math.round((standDuration ?? DEFAULT_TIMER_SECONDS.stand) / 60))
    setEditableAutoAdvanceStages(resolvedAutoAdvanceStages)
    setEditableContinueFromLastTime(
      (continueFromLastTime ?? globalSettings.defaultContinueFromLastTime) ?? false,
    )
    setEditableContinueWhileAppClosed(
      (continueWhileAppClosed ?? globalSettings.defaultContinueWhileAppClosed) ?? false,
    )
    setEditableWorkDurationMinutes(Math.round((workDuration ?? DEFAULT_TIMER_SECONDS.work) / 60))
    setEditableShortBreakMinutes(
      Math.round((shortBreakDuration ?? DEFAULT_TIMER_SECONDS.shortBreak) / 60),
    )
    setEditableLongBreakMinutes(Math.round((longBreakDuration ?? DEFAULT_TIMER_SECONDS.longBreak) / 60))
    setEditablePomodoroRounds(roundsBeforeLongBreak ?? DEFAULT_POMODORO_ROUNDS)
    setCurrentDisplayMode(displayMode === 'minimal' ? 'digital' : displayMode)
    setEditableBorderColor(borderColor ?? themeAccentColor)
    setEditableUseGlobalAlertVolume(alertVolume === undefined)
    setEditableAlertVolume(alertVolume ?? (globalSettings.defaultAlertVolume ?? DEFAULT_ALERT_VOLUME))
    setEditableUseGlobalAlertCues(useGlobalAlertCues)
    setEditableAlertCues(resolvedAlertCues)
    setEditableUseGlobalTimerNotifications(showTimerNotifications === undefined)
    setEditableShowTimerNotifications(
      showTimerNotifications ?? (globalSettings.defaultShowTimerNotifications ?? true),
    )
    setEditableUseGlobalFlashTaskbar(flashTaskbar === undefined)
    setEditableFlashTaskbar(flashTaskbar ?? (globalSettings.defaultFlashTaskbar ?? true))
    setEditableUseGlobalMascotSettings(useGlobalMascotSettings)
    setEditableMascotImagePath(mascotImagePath || '')
    setEditableMascotSize(mascotSize ?? (globalSettings.mascotSize ?? DEFAULT_MASCOT_SIZE))
    setEditableMascotPosition(mascotPosition ?? (globalSettings.mascotPosition ?? 'top-right'))
    setEditableUseGlobalMascotCues(useGlobalMascotAnimationCues)
    setEditableMascotAnimationCues(resolvedMascotAnimationCues)
  }, [
    alertVolume,
    autoAdvanceStages,
    autoLoop,
    continueFromLastTime,
    continueWhileAppClosed,
    displayMode,
    duration,
    flashTaskbar,
    globalSettings.defaultAlertVolume,
    globalSettings.defaultFlashTaskbar,
    globalSettings.defaultShowTimerNotifications,
    globalSettings.defaultAutoAdvanceStages,
    globalSettings.defaultContinueFromLastTime,
    globalSettings.defaultContinueWhileAppClosed,
    globalSettings.mascotPosition,
    borderColor,
    globalSettings.mascotSize,
    globalSettings.theme,
    longBreakDuration,
    mascotImagePath,
    mascotPosition,
    mascotScale,
    mascotSize,
    resolvedAlertCues,
    resolvedAutoAdvanceStages,
    resolvedBorderColor,
    resolvedMascotAnimationCues,
    roundsBeforeLongBreak,
    shortBreakDuration,
    sitDuration,
    showTimerNotifications,
    standDuration,
    themeAccentColor,
    timerMode,
    useGlobalAlertCues,
    useGlobalMascotAnimationCues,
    useGlobalMascotSettings,
    workDuration,
  ])

  const handleDisplayModeChange = (mode: ClockDisplayMode) => {
    setCurrentDisplayMode(mode)
    onDisplayModeChange?.(id, mode)
  }

  const addAlertCue = () => {
    appendWithGeneratedId(setEditableAlertCues, (id) => ({
      id,
      thresholdPercent: 50,
      soundPath: '',
    }))
  }

  const updateAlertCue = (cueId: string, updates: Partial<AlertCue>) => {
    updateById(setEditableAlertCues, cueId, updates)
  }

  const removeAlertCue = (cueId: string) => {
    removeById(setEditableAlertCues, cueId)
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
    appendWithGeneratedId(setEditableMascotAnimationCues, (id): MascotAnimationCue => ({
      id,
      thresholdPercent: 50,
      animation: 'wiggle',
    }))
  }

  const updateMascotAnimationCue = (
    cueId: string,
    updates: Partial<MascotAnimationCue>,
  ) => {
    updateById(setEditableMascotAnimationCues, cueId, updates)
  }

  const removeMascotAnimationCue = (cueId: string) => {
    removeById(setEditableMascotAnimationCues, cueId)
  }

  const handleMascotUpload: ChangeEventHandler<HTMLInputElement> = (event) => {
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
        thresholdPercent: clampPercent(cue.thresholdPercent, 1, 100),
        soundPath: cue.soundPath.trim(),
      }))

    const autoAdvanceStagesUpdate =
      editableAutoAdvanceStages === (globalSettings.defaultAutoAdvanceStages ?? true)
        ? undefined
        : editableAutoAdvanceStages
    const continueFromLastTimeUpdate =
      editableContinueFromLastTime === (globalSettings.defaultContinueFromLastTime ?? false)
        ? undefined
        : editableContinueFromLastTime
    const continueWhileAppClosedUpdate =
      editableContinueWhileAppClosed === (globalSettings.defaultContinueWhileAppClosed ?? false)
        ? undefined
        : editableContinueWhileAppClosed
    const borderColorUpdate = editableBorderColor.trim() || undefined

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
              autoAdvanceStages: autoAdvanceStagesUpdate,
              continueFromLastTime: continueFromLastTimeUpdate,
              continueWhileAppClosed: continueWhileAppClosedUpdate,
            }
          : {
              mode: editableTimerMode,
              workDuration: workDurationSeconds,
              shortBreakDuration: shortBreakSeconds,
              longBreakDuration: longBreakSeconds,
              roundsBeforeLongBreak: pomodoroRounds,
              autoAdvanceStages: autoAdvanceStagesUpdate,
              continueFromLastTime: continueFromLastTimeUpdate,
              continueWhileAppClosed: continueWhileAppClosedUpdate,
            }

    const nextUpdates: Partial<TimerConfig> = {
      displayMode: currentDisplayMode,
      ...timingUpdates,
      borderColor: borderColorUpdate,
      alertVolume: editableUseGlobalAlertVolume ? undefined : clampPercent(editableAlertVolume),
      useGlobalAlertCues: editableUseGlobalAlertCues,
      alertCues: cleanedAlertCues,
      showTimerNotifications:
        editableUseGlobalTimerNotifications ? undefined : editableShowTimerNotifications,
      flashTaskbar: editableUseGlobalFlashTaskbar ? undefined : editableFlashTaskbar,
      useGlobalMascotSettings: editableUseGlobalMascotSettings,
      mascotImagePath: editableUseGlobalMascotSettings ? undefined : editableMascotImagePath,
      mascotSize: editableUseGlobalMascotSettings ? undefined : editableMascotSize,
      mascotScale: editableUseGlobalMascotSettings
        ? undefined
        : 1,
      mascotPosition: editableUseGlobalMascotSettings ? undefined : editableMascotPosition,
      useGlobalMascotAnimationCues: editableUseGlobalMascotCues,
      mascotAnimationCues: editableMascotAnimationCues.map((cue) => ({
        ...cue,
        thresholdPercent: clampPercent(cue.thresholdPercent, 1, 100),
      })),
    }

    onTimerConfigChange?.(id, nextUpdates)

    const didTimingChange =
      editableTimerMode !== timerMode ||
      (timerType === 'generic' && genericDurationSeconds !== (duration ?? 10 * 60)) ||
      (timerType === 'sit-stand' &&
        (sitDurationSeconds !== (sitDuration ?? 25 * 60) ||
          standDurationSeconds !== (standDuration ?? 5 * 60))) ||
      (timerType === 'pomodoro' &&
        (workDurationSeconds !== (workDuration ?? 25 * 60) ||
          shortBreakSeconds !== (shortBreakDuration ?? 5 * 60) ||
          longBreakSeconds !== (longBreakDuration ?? 15 * 60)))

    if (didTimingChange) {
      const nextPhaseLabel = getResolvedPhaseLabel(timerType, editableTimerMode, currentPhaseLabel)
      const nextTimeRemaining = getPhaseTotalSeconds(
        {
          type: timerType,
          mode: editableTimerMode,
          duration: timerType === 'generic' ? genericDurationSeconds : duration,
          sitDuration: timerType === 'sit-stand' ? sitDurationSeconds : sitDuration,
          standDuration: timerType === 'sit-stand' ? standDurationSeconds : standDuration,
          workDuration: timerType === 'pomodoro' ? workDurationSeconds : workDuration,
          shortBreakDuration: timerType === 'pomodoro' ? shortBreakSeconds : shortBreakDuration,
          longBreakDuration: timerType === 'pomodoro' ? longBreakSeconds : longBreakDuration,
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

  const settingsModalProps = {
    isOpen: isSettingsOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    onClose: () => setIsSettingsOpen(false),
    onSave: saveTimerSettings,
    displayModeOptions: DISPLAY_MODE_OPTIONS,
    displayModeLabels: DISPLAY_MODE_LABELS,
    currentDisplayMode,
    onDisplayModeChange: handleDisplayModeChange,
    editableBorderColor,
    setEditableBorderColor,
    timerType,
    editableTimerMode,
    setEditableTimerMode,
    editableDurationMinutes,
    setEditableDurationMinutes,
    editableSitDurationMinutes,
    setEditableSitDurationMinutes,
    editableStandDurationMinutes,
    setEditableStandDurationMinutes,
    editableAutoAdvanceStages,
    setEditableAutoAdvanceStages,
    editableWorkDurationMinutes,
    setEditableWorkDurationMinutes,
    editableShortBreakMinutes,
    setEditableShortBreakMinutes,
    editableLongBreakMinutes,
    setEditableLongBreakMinutes,
    editablePomodoroRounds,
    setEditablePomodoroRounds,
    editableContinueFromLastTime,
    setEditableContinueFromLastTime,
    editableContinueWhileAppClosed,
    setEditableContinueWhileAppClosed,
    showContinuityCatchupNote:
      editableContinueFromLastTime && editableContinueWhileAppClosed,
    editableUseGlobalAlertVolume,
    setEditableUseGlobalAlertVolume,
    editableAlertVolume,
    setEditableAlertVolume,
    editableUseGlobalAlertCues,
    setEditableUseGlobalAlertCues,
    editableAlertCues,
    updateAlertCue,
    browseAlertCueSound,
    removeAlertCue,
    addAlertCue,
    editableUseGlobalTimerNotifications,
    setEditableUseGlobalTimerNotifications,
    editableShowTimerNotifications,
    setEditableShowTimerNotifications,
    editableUseGlobalFlashTaskbar,
    setEditableUseGlobalFlashTaskbar,
    editableFlashTaskbar,
    setEditableFlashTaskbar,
    editableUseGlobalMascotSettings,
    setEditableUseGlobalMascotSettings,
    editableMascotImagePath,
    setEditableMascotImagePath,
    handleMascotUpload,
    editableMascotSize,
    setEditableMascotSize,
    editableMascotPosition,
    setEditableMascotPosition,
    editableUseGlobalMascotCues,
    setEditableUseGlobalMascotCues,
    editableMascotAnimationCues,
    updateMascotAnimationCue,
    removeMascotAnimationCue,
    addMascotAnimationCue,
    mascotAnimationTypes: MASCOT_ANIMATION_TYPES,
  }

  return {
    globalSettings,
    currentDisplayMode,
    resolvedBorderColor,
    isSettingsOpen,
    openSettings: (tab: SettingsTab = 'general') => { setActiveSettingsTab(tab); setIsSettingsOpen(true) },
    settingsModalProps,
  }
}