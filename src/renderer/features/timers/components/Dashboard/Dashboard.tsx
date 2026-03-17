/**
 * Dashboard component - main layout
 */

import React, { useEffect, useState } from 'react'
import { generateId } from '@shared/utils'
import {
  DEFAULT_GENERIC_DURATION,
  DEFAULT_SIT_DURATION,
  DEFAULT_STAND_DURATION,
  DEFAULT_POMODORO_WORK,
  DEFAULT_POMODORO_SHORT_BREAK,
  DEFAULT_POMODORO_LONG_BREAK,
  DEFAULT_POMODORO_ROUNDS_BEFORE_LONG,
} from '@shared/constants'
import { buildTimerConfig } from '../../utils/timerConfigFactory'
import { getNextCircularIndex, getPreviousCircularIndex } from '../../utils/carousel'
import { resolveDefaultModeByTimerType } from '../../utils/timerMode'
import { useIpcSubscription } from '../../../../hooks/useIpcSubscription'
import { useSettingsUpdater } from '../../../settings/hooks/useSettingsUpdater'
import { TimerTile } from '../TimerTile/TimerTile'
import { SettingsPanel } from '../../../settings/components/SettingsPanel/SettingsPanel'
import { useGlobalStore } from '../../../../store/globalStore'
import type { TimerConfig } from '../../../../../types'
import type { TimerType, TimerMode } from '../../../../../types'
import styles from './Dashboard.module.css'

export const Dashboard: React.FC = () => {
  const globalSettings = useGlobalStore((state) => state.settings)
  const applySettingsUpdate = useSettingsUpdater()
  const [timers, setTimers] = useState<TimerConfig[]>([])
  const [compactTimerIndex, setCompactTimerIndex] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
  const [isCreateTimerOpen, setIsCreateTimerOpen] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false)
  const [isUpdateReady, setIsUpdateReady] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateStatus, setUpdateStatus] = useState('Preparing download...')
  const [updateError, setUpdateError] = useState<string | null>(null)

  const resetUpdateModalState = () => {
    setUpdateError(null)
    setIsUpdateReady(false)
    setUpdateProgress(0)
    setUpdateStatus('Preparing download...')
    setIsDownloadingUpdate(true)
  }

  const [newTimerType, setNewTimerType] = useState<TimerType>('generic')
  const [newTimerLabel, setNewTimerLabel] = useState('')
  const [newTimerMode, setNewTimerMode] = useState<TimerMode>('countdown')
  const [newGenericMinutes, setNewGenericMinutes] = useState(Math.round(DEFAULT_GENERIC_DURATION / 60))
  const [newSitMinutes, setNewSitMinutes] = useState(Math.round(DEFAULT_SIT_DURATION / 60))
  const [newStandMinutes, setNewStandMinutes] = useState(Math.round(DEFAULT_STAND_DURATION / 60))
  const [newWorkMinutes, setNewWorkMinutes] = useState(Math.round(DEFAULT_POMODORO_WORK / 60))
  const [newShortBreakMinutes, setNewShortBreakMinutes] = useState(
    Math.round(DEFAULT_POMODORO_SHORT_BREAK / 60),
  )
  const [newLongBreakMinutes, setNewLongBreakMinutes] = useState(
    Math.round(DEFAULT_POMODORO_LONG_BREAK / 60),
  )
  const [newPomodoroRounds, setNewPomodoroRounds] = useState(DEFAULT_POMODORO_ROUNDS_BEFORE_LONG)

  const getDefaultModeByType = (type: TimerType): TimerMode => {
    return resolveDefaultModeByTimerType(type, globalSettings)
  }

  useEffect(() => {
    const loadTimers = async () => {
      try {
        const response = await window.electronAPI?.getTimers()
        if (response?.success && Array.isArray(response.data)) {
          setTimers(response.data)
        }
      } catch {
        // Ignore transient startup IPC issues.
      }
    }

    loadTimers()
  }, [])

  useEffect(() => {
    if (timers.length === 0) {
      setCompactTimerIndex(0)
      return
    }

    if (compactTimerIndex > timers.length - 1) {
      setCompactTimerIndex(timers.length - 1)
    }
  }, [compactTimerIndex, timers.length])

  useIpcSubscription(() => {
    const unsubUpdateAvailable = window.electronAPI?.onUpdateAvailable(() => {
      setIsUpdateAvailable(true)
    })

    const unsubUpdateProgress = window.electronAPI?.onUpdateProgress((data: { percent?: number }) => {
      const percent = Math.max(0, Math.min(100, Math.round(data?.percent || 0)))
      setUpdateProgress(percent)
      setUpdateStatus(`Downloading... ${percent}%`)
      setIsDownloadingUpdate(percent < 100)
    })

    const unsubUpdateReady = window.electronAPI?.onUpdateReady(() => {
      setUpdateProgress(100)
      setUpdateStatus('Download complete!')
      setIsDownloadingUpdate(false)
      setIsUpdateReady(true)
    })

    const unsubUpdateError = window.electronAPI?.onUpdateError((data: { message?: string }) => {
      setUpdateError(data?.message || 'Updater failed.')
      setIsDownloadingUpdate(false)
    })

    return () => {
      unsubUpdateAvailable?.()
      unsubUpdateProgress?.()
      unsubUpdateReady?.()
      unsubUpdateError?.()
    }
  }, [])

  const handleOpenUpdateModal = async () => {
    setIsUpdateModalOpen(true)
    resetUpdateModalState()

    const result = await window.electronAPI?.startUpdateDownload()
    if (!result?.success) {
      setIsDownloadingUpdate(false)
      setUpdateError(result?.error || 'Failed to start update download.')
    }
  }

  const handleInstallUpdate = async () => {
    const result = await window.electronAPI?.installDownloadedUpdate()
    if (!result?.success) {
      setUpdateError(result?.error || 'Failed to install update.')
    }
  }

  const updateTimer = (id: string, updates: Partial<TimerConfig>) => {
    setTimers((prev) =>
      prev.map((timer) => (timer.id === id ? { ...timer, ...updates } : timer)),
    )

    window.electronAPI?.updateTimer(id, updates).catch(() => {
      // Ignore transient IPC failures during hot reload; local UI stays updated
    })
  }

  const deleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id))

    window.electronAPI?.deleteTimer(id).catch(() => {
      // Ignore transient IPC failures during hot reload; local UI stays updated
    })
  }

  const handleCreateTimer = async () => {
    const nextIndex = timers.length + 1
    const timerId = generateId()
    const timerConfig = buildTimerConfig({
      timerId,
      timerType: newTimerType,
      timerMode: newTimerMode,
      defaultModeByType: getDefaultModeByType,
      timerLabel: newTimerLabel,
      timerIndex: nextIndex,
      genericMinutes: newGenericMinutes,
      sitMinutes: newSitMinutes,
      standMinutes: newStandMinutes,
      workMinutes: newWorkMinutes,
      shortBreakMinutes: newShortBreakMinutes,
      longBreakMinutes: newLongBreakMinutes,
      pomodoroRounds: newPomodoroRounds,
    })

    setTimers((prev) => [...prev, timerConfig])
    setIsCreateTimerOpen(false)
    setNewTimerLabel('')

    try {
      const result = await window.electronAPI?.createTimer(timerConfig)
      if (result && !result.success) {
        console.warn('Create timer request was not accepted by main process.')
      }
    } catch {
      // Keep optimistic UI behavior; this can happen briefly during hot reload
    }
  }

  const goToPreviousCompactTimer = () => {
    setCompactTimerIndex((currentIndex) => {
      return getPreviousCircularIndex(currentIndex, timers.length)
    })
  }

  const goToNextCompactTimer = () => {
    setCompactTimerIndex((currentIndex) => {
      return getNextCircularIndex(currentIndex, timers.length)
    })
  }

  const renderTimerTile = (timer: TimerConfig) => (
    <TimerTile
      key={timer.id}
      id={timer.id}
      label={timer.label}
      isCompact={globalSettings.compactMode}
      timerType={timer.type}
      timerMode={timer.mode}
      displayMode={timer.displayMode}
      duration={timer.duration}
      sitDuration={timer.sitDuration}
      standDuration={timer.standDuration}
      autoLoop={timer.autoLoop}
      continueFromLastTime={timer.continueFromLastTime}
      continueWhileAppClosed={timer.continueWhileAppClosed}
      workDuration={timer.workDuration}
      shortBreakDuration={timer.shortBreakDuration}
      longBreakDuration={timer.longBreakDuration}
      roundsBeforeLongBreak={timer.roundsBeforeLongBreak}
      accentColor={timer.accentColor}
      alertVolume={timer.alertVolume}
      alertCues={timer.alertCues}
      useGlobalAlertCues={timer.useGlobalAlertCues}
      mascotImagePath={timer.mascotImagePath}
      mascotSize={timer.mascotSize}
      mascotScale={timer.mascotScale}
      mascotPosition={timer.mascotPosition}
      useGlobalMascotSettings={timer.useGlobalMascotSettings}
      mascotAnimationCues={timer.mascotAnimationCues}
      useGlobalMascotAnimationCues={timer.useGlobalMascotAnimationCues}
      onLabelChange={(timerId, nextLabel) => updateTimer(timerId, { label: nextLabel })}
      onDisplayModeChange={(timerId, mode) => updateTimer(timerId, { displayMode: mode })}
      onTimerConfigChange={(timerId, updates) => updateTimer(timerId, updates)}
      onDeleteTimer={(timerId) => deleteTimer(timerId)}
    />
  )

  const compactTimer = timers[compactTimerIndex]

  const setCompactMode = (compactMode: boolean) => {
    applySettingsUpdate({ compactMode })
  }

  return (
    <div className={`${styles.container} ${globalSettings.compactMode ? styles.compact : ''}`}>
      <header className={styles.header}>
        <h1>Cozy Clock</h1>
        <div className={styles.headerControls}>
          {isUpdateAvailable && (
            <button
              className={styles.updateButton}
              onClick={handleOpenUpdateModal}
              aria-label="Open updater"
            >
              Update Available
            </button>
          )}
          {isHeaderMenuOpen && <button className={styles.menuBackdrop} onClick={() => setIsHeaderMenuOpen(false)} aria-label="Close menu" />}
          <div className={styles.menuWrap}>
            <button
              className={styles.settingsButton}
              onClick={() => setIsHeaderMenuOpen((open) => !open)}
              aria-label="Open application menu"
            >
              Menu ▾
            </button>
            {isHeaderMenuOpen && (
              <div className={styles.menuDropdown} role="menu" aria-label="Application menu">
                <label className={styles.menuToggleRow}>
                  <span className={styles.menuToggleLabel}>Compact</span>
                  <input
                    className={styles.menuSwitchInput}
                    type="checkbox"
                    checked={globalSettings.compactMode ?? false}
                    onChange={(event) => setCompactMode(event.target.checked)}
                  />
                  <span className={styles.menuSwitchTrack}>
                    <span className={styles.menuSwitchThumb} />
                  </span>
                </label>
                <div className={styles.menuDivider} />
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setIsSettingsOpen(true)
                    setIsHeaderMenuOpen(false)
                  }}
                >
                  Settings
                </button>
                <div className={styles.menuDivider} />
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    window.electronAPI?.quitApp()
                    setIsHeaderMenuOpen(false)
                  }}
                >
                  Quit
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isSettingsOpen && (
        <div className={styles.settingsOverlay} onClick={() => setIsSettingsOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Application settings" onClick={(event) => event.stopPropagation()}>
            <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <div className={styles.settingsOverlay} onClick={() => setIsUpdateModalOpen(false)}>
          <div className={styles.updateModal} role="dialog" aria-modal="true" aria-label="Updater" onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.updateModalTitle}>
              {isUpdateReady ? 'Update Ready' : 'Downloading Update'}
            </h3>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar} style={{ width: `${updateProgress}%` }}>
                {updateProgress}%
              </div>
            </div>
            <p className={styles.updateStatus}>{updateStatus}</p>
            {updateError && <p className={styles.updateError}>{updateError}</p>}
            <div className={styles.updateActions}>
              {isUpdateReady ? (
                <button className={styles.installButton} onClick={handleInstallUpdate}>
                  Install and Restart
                </button>
              ) : (
                <button className={styles.settingsButton} disabled={isDownloadingUpdate}>
                  {isDownloadingUpdate ? 'Downloading...' : 'Waiting...'}
                </button>
              )}
              <button className={styles.settingsButton} onClick={() => setIsUpdateModalOpen(false)}>
                {isUpdateReady ? 'Later' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
        {globalSettings.compactMode ? (
          <section className={styles.compactViewport}>
            {compactTimer ? (
              <>
                <div className={styles.compactNav}>
                  <button
                    className={styles.compactNavButton}
                    onClick={goToPreviousCompactTimer}
                    aria-label="Show previous timer"
                  >
                    ←
                  </button>
                  <div className={styles.compactNavMeta}>
                    <div className={styles.compactNavTitle}>{compactTimer.label}</div>
                    <div className={styles.compactNavCounter}>
                      Timer {compactTimerIndex + 1} of {timers.length}
                    </div>
                  </div>
                  <button
                    className={styles.compactNavButton}
                    onClick={goToNextCompactTimer}
                    aria-label="Show next timer"
                  >
                    →
                  </button>
                </div>
                {renderTimerTile(compactTimer)}
                <div className={styles.compactActions}>
                  <button className={styles.addButton} onClick={() => setIsCreateTimerOpen(true)}>
                    + Add Timer
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <p>No timers yet</p>
                <button className={styles.addButton} onClick={() => setIsCreateTimerOpen(true)}>
                  + Add Timer
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className={styles.timerGrid}>
            {timers.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No timers yet</p>
                <button className={styles.addButton} onClick={() => setIsCreateTimerOpen(true)}>
                  + Add Timer
                </button>
              </div>
            ) : (
              <>
                {timers.map((timer) => renderTimerTile(timer))}
                <button className={styles.addButton} onClick={() => setIsCreateTimerOpen(true)}>
                  + Add Timer
                </button>
              </>
            )}
          </section>
        )}
      </main>

      {isCreateTimerOpen && (
        <div className={`${styles.settingsOverlay} ${styles.lockedOverlay}`}>
          <div className={styles.updateModal} role="dialog" aria-modal="true" aria-label="Create timer">
            <h3 className={styles.updateModalTitle}>Create Timer</h3>

            <label className={styles.modalField}>
              Timer Type
              <select aria-label="Timer type" value={newTimerType} onChange={(event) => setNewTimerType(event.target.value as TimerType)}>
                <option value="generic">Generic</option>
                <option value="sit-stand">Sit Stand</option>
                <option value="pomodoro">Pomodoro</option>
              </select>
            </label>

            <label className={styles.modalField}>
              Label
              <input
                type="text"
                aria-label="Timer label"
                value={newTimerLabel}
                onChange={(event) => setNewTimerLabel(event.target.value)}
                placeholder="Optional custom label"
              />
            </label>

            {newTimerType === 'generic' && (
              <>
                <label className={styles.modalField}>
                  Mode
                  <select aria-label="Generic timer mode" value={newTimerMode} onChange={(event) => setNewTimerMode(event.target.value as TimerMode)}>
                    <option value="countdown">Countdown</option>
                    <option value="countup">Count Up</option>
                  </select>
                </label>
                <label className={styles.modalField}>
                  Duration (minutes)
                  <input
                    type="number"
                    aria-label="Generic timer minutes"
                    min={1}
                    value={newGenericMinutes}
                    onChange={(event) => setNewGenericMinutes(Number(event.target.value))}
                  />
                </label>
              </>
            )}

            {newTimerType === 'sit-stand' && (
              <>
                <label className={styles.modalField}>
                  Sit Duration (minutes)
                  <input
                    type="number"
                    aria-label="Sit duration minutes"
                    min={1}
                    value={newSitMinutes}
                    onChange={(event) => setNewSitMinutes(Number(event.target.value))}
                  />
                </label>
                <label className={styles.modalField}>
                  Stand Duration (minutes)
                  <input
                    type="number"
                    aria-label="Stand duration minutes"
                    min={1}
                    value={newStandMinutes}
                    onChange={(event) => setNewStandMinutes(Number(event.target.value))}
                  />
                </label>
              </>
            )}

            {newTimerType === 'pomodoro' && (
              <>
                <label className={styles.modalField}>
                  Work (minutes)
                  <input
                    type="number"
                    aria-label="Pomodoro work minutes"
                    min={1}
                    value={newWorkMinutes}
                    onChange={(event) => setNewWorkMinutes(Number(event.target.value))}
                  />
                </label>
                <label className={styles.modalField}>
                  Short Break (minutes)
                  <input
                    type="number"
                    aria-label="Pomodoro short break minutes"
                    min={1}
                    value={newShortBreakMinutes}
                    onChange={(event) => setNewShortBreakMinutes(Number(event.target.value))}
                  />
                </label>
                <label className={styles.modalField}>
                  Long Break (minutes)
                  <input
                    type="number"
                    aria-label="Pomodoro long break minutes"
                    min={1}
                    value={newLongBreakMinutes}
                    onChange={(event) => setNewLongBreakMinutes(Number(event.target.value))}
                  />
                </label>
                <label className={styles.modalField}>
                  Rounds Before Long Break
                  <input
                    type="number"
                    aria-label="Pomodoro rounds before long break"
                    min={1}
                    value={newPomodoroRounds}
                    onChange={(event) => setNewPomodoroRounds(Number(event.target.value))}
                  />
                </label>
              </>
            )}

            <div className={styles.updateActions}>
              <button className={styles.settingsButton} onClick={() => setIsCreateTimerOpen(false)}>
                Cancel
              </button>
              <button className={styles.installButton} onClick={handleCreateTimer}>
                Add Timer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
