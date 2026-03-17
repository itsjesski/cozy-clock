import React, { useEffect, useState } from 'react'
import { DigitalClock } from '../ClockFaces/DigitalClock'
import { AnalogClock } from '../ClockFaces/AnalogClock'
import { RingClock } from '../ClockFaces/RingClock'
import { FlipClock } from '../ClockFaces/FlipClock'
import { MascotDisplay } from '../../../../components/MascotDisplay/MascotDisplay'
import { TimerActions } from './TimerActions'
import { TimerStatsPanel } from './TimerStatsPanel'
import { TimerTileDeleteConfirm } from './TimerTileDeleteConfirm'
import { TimerTileSettingsModal } from './TimerTileSettingsModal'
import {
  type SplitStatsOption,
  type SplitStatsView,
} from './TimerSplitStatsSection'
import { useTimerTileRuntime } from '../../hooks/useTimerTileRuntime'
import { useTimerTileSettings } from '../../hooks/useTimerTileSettings'
import { useTimerTileStats } from '../../hooks/useTimerTileStats'
import { getPlayPauseLabel } from '../../utils/timerControls'
import { getPeriodValueForSplitView } from '../../utils/timerStats'
import styles from './TimerTile.module.css'
import { DEFAULT_MASCOT_SIZE } from '@shared/constants'
import type {
  ClockDisplayMode,
  AlertCue,
  TimerConfig,
  MascotAnimationCue,
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

const PERIODS: Array<{ key: keyof TimerPeriodStats; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
]
const SIT_STAND_STATS_OPTIONS: SplitStatsOption[] = [
  { key: 'sit', label: 'Sit' },
  { key: 'stand', label: 'Stand' },
]
const POMODORO_STATS_OPTIONS: SplitStatsOption[] = [
  { key: 'work', label: 'Work' },
  { key: 'break', label: 'Break' },
]

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
  const [editableLabel, setEditableLabel] = useState(label)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isStatsFlipped, setIsStatsFlipped] = useState(false)
  const [splitStatsView, setSplitStatsView] = useState<SplitStatsView>(
    timerType === 'pomodoro' ? 'work' : 'sit',
  )

  const {
    state,
    setState,
    isLoading,
    mascotAnimationType,
    mascotAnimationNonce,
    getCurrentPhaseTotal,
    handlePlayPause,
    handleNextPhase,
    handleReset,
  } = useTimerTileRuntime({
    id,
    timerType,
    timerMode,
    duration,
    sitDuration,
    standDuration,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
  })

  const { timerStats, isStatsLoading, hasLoadedTimerStats, loadTimerStats } = useTimerTileStats({
    id,
    timerType,
    timerState: state,
    isStatsFlipped,
  })

  const {
    globalSettings,
    currentDisplayMode,
    resolvedBorderColor,
    isSettingsOpen,
    openSettings,
    settingsModalProps,
  } = useTimerTileSettings({
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
    mascotImagePath,
    mascotSize,
    mascotScale,
    mascotPosition,
    useGlobalMascotSettings,
    mascotAnimationCues,
    useGlobalMascotAnimationCues,
    currentPhaseLabel: state.currentPhaseLabel,
    setState,
    onDisplayModeChange,
    onTimerConfigChange,
  })

  useEffect(() => {
    setEditableLabel(label)
  }, [label])

  useEffect(() => {
    setSplitStatsView(timerType === 'pomodoro' ? 'work' : 'sit')
  }, [timerType])

  useEffect(() => {
    if (isCompact) {
      setIsStatsFlipped(false)
    }
  }, [isCompact])

  const clockProps = {
    timeRemaining: state.timeRemaining,
    total: getCurrentPhaseTotal(state.currentPhaseLabel),
  }
  const clockFace =
    currentDisplayMode === 'analog' ? <AnalogClock {...clockProps} />
      : currentDisplayMode === 'ring' ? <RingClock {...clockProps} />
        : currentDisplayMode === 'flip' ? <FlipClock timeRemaining={state.timeRemaining} />
          : <DigitalClock timeRemaining={state.timeRemaining} />

  const handleLabelBlur = () => {
    const trimmed = editableLabel.trim()
    const nextLabel = trimmed.length > 0 ? trimmed : label
    setEditableLabel(nextLabel)
    onLabelChange?.(id, nextLabel)
  }

  const handleResetWithStats = async () => {
    await handleReset(async () => {
      if (!isStatsFlipped) return
      await loadTimerStats(false)
      setTimeout(() => {
        void loadTimerStats(false)
      }, 200)
    })
  }

  const playPauseLabel = getPlayPauseLabel(state.phase)
  const effectiveMascotImagePath =
    useGlobalMascotSettings === false ? mascotImagePath : globalSettings.mascotImagePath
  const effectiveMascotSize = useGlobalMascotSettings === false
    ? (mascotSize ?? DEFAULT_MASCOT_SIZE)
    : (globalSettings.mascotSize ?? DEFAULT_MASCOT_SIZE)
  const effectiveMascotScale = 1
  const effectiveMascotPosition = useGlobalMascotSettings === false
    ? (mascotPosition ?? 'top-right')
    : (globalSettings.mascotPosition ?? 'top-right')

  const getPeriodValueForView = (period: keyof TimerPeriodStats, view: SplitStatsView): number => {
    return getPeriodValueForSplitView(timerStats, period, view)
  }
  const cycleStatusText =
    timerType === 'generic'
      ? null
      : (state.currentPhaseLabel ?? (timerType === 'sit-stand' ? 'Standing' : 'Work'))

  return (
    <div
      className={`${styles.tile} ${styles[state.phase]} ${isCompact ? styles.compactTile : ''} ${(isSettingsOpen || isDeleteConfirmOpen) ? styles.modalOpen : ''}`}
      style={{
        ['--tile-border' as string]: resolvedBorderColor || 'var(--accent-primary)',
        ['--tile-accent' as string]: resolvedBorderColor || 'var(--accent-primary)',
      }}
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
            onClick={() => openSettings('general')}
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
              {clockFace}
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

            {cycleStatusText && (
              <p className={styles.phaseStatus} aria-live="polite">
                {cycleStatusText}
              </p>
            )}

            <TimerActions
              playPauseLabel={playPauseLabel}
              isLoading={isLoading}
              showNextButton={timerType === 'pomodoro' || timerType === 'sit-stand'}
              onPlayPause={handlePlayPause}
              onNextPhase={handleNextPhase}
              onReset={handleResetWithStats}
            />
          </div>

          <div className={styles.faceBack}>
            <TimerStatsPanel
              timerType={timerType}
              timerStats={timerStats}
              periods={PERIODS}
              sitStandOptions={SIT_STAND_STATS_OPTIONS}
              pomodoroOptions={POMODORO_STATS_OPTIONS}
              splitStatsView={splitStatsView}
              setSplitStatsView={setSplitStatsView}
              getPeriodValueForView={getPeriodValueForView}
              isStatsLoading={isStatsLoading}
              hasLoadedTimerStats={hasLoadedTimerStats}
            />
          </div>
        </div>
      </div>

      <TimerTileSettingsModal {...settingsModalProps} />

      <TimerTileDeleteConfirm
        isOpen={isDeleteConfirmOpen}
        label={editableLabel}
        onDelete={() => {
          setIsDeleteConfirmOpen(false)
          onDeleteTimer?.(id)
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

    </div>
  )
}

export default TimerTile
