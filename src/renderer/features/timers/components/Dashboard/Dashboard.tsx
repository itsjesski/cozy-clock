/**
 * Dashboard component - main layout
 */

import React, { useEffect, useState } from 'react'
import { getNextCircularIndex, getPreviousCircularIndex } from '../../utils/carousel'
import { resolveDefaultModeByTimerType } from '../../utils/timerMode'
import { useCreateTimerForm } from '../../hooks/useCreateTimerForm'
import { useUpdaterModal } from '../../hooks/useUpdaterModal'
import { useSettingsUpdater } from '../../../settings/hooks/useSettingsUpdater'
import { TimerTile } from '../TimerTile/TimerTile'
import { CreateTimerModal } from './CreateTimerModal'
import { UpdaterModal } from './UpdaterModal'
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

  const {
    isUpdateAvailable,
    isUpdateModalOpen,
    isDownloadingUpdate,
    isUpdateReady,
    updateProgress,
    updateStatus,
    updateError,
    handleOpenUpdateModal,
    handleInstallUpdate,
    closeUpdateModal,
  } = useUpdaterModal()

  const getDefaultModeByType = (type: TimerType): TimerMode => {
    return resolveDefaultModeByTimerType(type, globalSettings)
  }

  const {
    form,
    setFormField,
    handleCreateTimer,
  } = useCreateTimerForm({
    timers,
    setTimers,
    getDefaultModeByType,
    setIsCreateTimerOpen,
  })

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
      autoAdvanceStages={timer.autoAdvanceStages}
      autoLoop={timer.autoLoop}
      continueFromLastTime={timer.continueFromLastTime}
      continueWhileAppClosed={timer.continueWhileAppClosed}
      workDuration={timer.workDuration}
      shortBreakDuration={timer.shortBreakDuration}
      longBreakDuration={timer.longBreakDuration}
      roundsBeforeLongBreak={timer.roundsBeforeLongBreak}
      borderColor={timer.borderColor}
      alertVolume={timer.alertVolume}
      alertCues={timer.alertCues}
      useGlobalAlertCues={timer.useGlobalAlertCues}
      showTimerNotifications={timer.showTimerNotifications}
      flashTaskbar={timer.flashTaskbar}
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

      <UpdaterModal
        isOpen={isUpdateModalOpen}
        isUpdateReady={isUpdateReady}
        updateProgress={updateProgress}
        updateStatus={updateStatus}
        updateError={updateError}
        isDownloadingUpdate={isDownloadingUpdate}
        onInstall={handleInstallUpdate}
        onClose={closeUpdateModal}
      />

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

      <footer className={styles.footer} aria-label="App footer">
        <span className={styles.footerText}>Built with ❤️ by -Jesski-</span>
      </footer>

      <CreateTimerModal
        isOpen={isCreateTimerOpen}
        form={form}
        setFormField={setFormField}
        onCancel={() => setIsCreateTimerOpen(false)}
        onCreate={handleCreateTimer}
      />
    </div>
  )
}

export default Dashboard
