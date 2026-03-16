/**
 * SettingsPanel component
 */

import React from 'react'
import { generateId } from '@shared/utils'
import { AVAILABLE_THEMES, THEME_LABELS } from '@shared/constants'
import { useGlobalStore } from '../../store/globalStore'
import type { AlertCue, MascotAnimationCue, MascotAnimationType } from '../../../types'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const settings = useGlobalStore((state) => state.settings)
  const setSettings = useGlobalStore((state) => state.setSettings)

  const mascotAnimationTypes: MascotAnimationType[] = ['shake', 'wiggle', 'bounce']

  const updateGlobalAlertCue = (cueId: string, updates: Partial<AlertCue>) => {
    const next = (settings.defaultAlertCues || []).map((cue) =>
      cue.id === cueId ? { ...cue, ...updates } : cue,
    )
    setSettings({ defaultAlertCues: next })
    window.electronAPI?.updateSettings({ defaultAlertCues: next })
  }

  const addGlobalAlertCue = () => {
    const next = [
      ...(settings.defaultAlertCues || []),
      { id: generateId(), thresholdPercent: 50, soundPath: '' },
    ]
    setSettings({ defaultAlertCues: next })
    window.electronAPI?.updateSettings({ defaultAlertCues: next })
  }

  const removeGlobalAlertCue = (cueId: string) => {
    const next = (settings.defaultAlertCues || []).filter((cue) => cue.id !== cueId)
    setSettings({ defaultAlertCues: next })
    window.electronAPI?.updateSettings({ defaultAlertCues: next })
  }

  const updateGlobalMascotCue = (cueId: string, updates: Partial<MascotAnimationCue>) => {
    const next = (settings.defaultMascotAnimationCues || []).map((cue) =>
      cue.id === cueId ? { ...cue, ...updates } : cue,
    )
    setSettings({ defaultMascotAnimationCues: next })
    window.electronAPI?.updateSettings({ defaultMascotAnimationCues: next })
  }

  const addGlobalMascotCue = () => {
    const next = [
      ...(settings.defaultMascotAnimationCues || []),
      { id: generateId(), thresholdPercent: 50, animation: 'wiggle' as MascotAnimationType },
    ]
    setSettings({ defaultMascotAnimationCues: next })
    window.electronAPI?.updateSettings({ defaultMascotAnimationCues: next })
  }

  const removeGlobalMascotCue = (cueId: string) => {
    const next = (settings.defaultMascotAnimationCues || []).filter((cue) => cue.id !== cueId)
    setSettings({ defaultMascotAnimationCues: next })
    window.electronAPI?.updateSettings({ defaultMascotAnimationCues: next })
  }

  const handleMascotUpload: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const mascotImagePath = typeof reader.result === 'string' ? reader.result : undefined
      if (!mascotImagePath) return
      setSettings({ mascotImagePath })
      window.electronAPI?.updateSettings({ mascotImagePath })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <label className={styles.field}>
          Theme
          <select
            className={styles.select}
            value={settings.theme}
            onChange={(event) => {
              const theme = event.target.value
              setSettings({ theme })
              window.electronAPI?.updateSettings({ theme })
            }}
          >
            {AVAILABLE_THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {THEME_LABELS[theme]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Window Behavior</h3>
        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={settings.alwaysOnTop ?? false}
            onChange={(event) => {
              const alwaysOnTop = event.target.checked
              setSettings({ alwaysOnTop })
              window.electronAPI?.updateSettings({ alwaysOnTop })
            }}
          />
          Always On Top
        </label>

        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={settings.minimizeToTray ?? true}
            onChange={(event) => {
              const minimizeToTray = event.target.checked
              setSettings({ minimizeToTray })
              window.electronAPI?.updateSettings({ minimizeToTray })
            }}
          />
          Minimize To Tray
        </label>

        <label className={styles.field}>
          Server Port
          <input
            className={styles.numberInput}
            type="number"
            min={1024}
            max={65535}
            value={settings.serverPort ?? 5173}
            onChange={(event) => {
              const parsedPort = Number(event.target.value)
              const serverPort = Number.isInteger(parsedPort) && parsedPort >= 1024 && parsedPort <= 65535
                ? parsedPort
                : 5173
              setSettings({ serverPort })
              window.electronAPI?.updateSettings({ serverPort })
            }}
          />
          <span className={styles.helpText}>HTTP port for the app. Applies on next restart. If in use, a prompt will appear.</span>
        </label>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Timer Continuity</h3>
        <div className={styles.subsection}>
          <label className={styles.optionRow}>
            <input
              type="checkbox"
              checked={settings.defaultContinueFromLastTime ?? false}
              onChange={(event) => {
                const defaultContinueFromLastTime = event.target.checked
                setSettings({ defaultContinueFromLastTime })
                window.electronAPI?.updateSettings({ defaultContinueFromLastTime })
              }}
            />
            <span className={styles.optionText}>
              <span className={styles.optionTitle}>Restore saved time</span>
              <span className={styles.optionDescription}>Reopen paused timers at the last saved time.</span>
            </span>
          </label>

          <label className={styles.optionRow}>
            <input
              type="checkbox"
              checked={settings.defaultContinueWhileAppClosed ?? false}
              onChange={(event) => {
                const defaultContinueWhileAppClosed = event.target.checked
                setSettings({ defaultContinueWhileAppClosed })
                window.electronAPI?.updateSettings({ defaultContinueWhileAppClosed })
              }}
            />
            <span className={styles.optionText}>
              <span className={styles.optionTitle}>Keep running while closed</span>
              <span className={styles.optionDescription}>Catch up based on real time while the app is closed.</span>
            </span>
          </label>

          {(settings.defaultContinueFromLastTime ?? false) &&
            (settings.defaultContinueWhileAppClosed ?? false) && (
              <p className={styles.infoPill}>Paused timers restore. Running timers catch up.</p>
            )}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Timer Modes</h3>
        <label className={styles.field}>
          Generic Default Mode
          <select
            className={styles.select}
            value={settings.defaultGenericMode ?? 'countdown'}
            onChange={(event) => {
              const defaultGenericMode = event.target.value as 'countdown' | 'countup'
              setSettings({ defaultGenericMode })
              window.electronAPI?.updateSettings({ defaultGenericMode })
            }}
          >
            <option value="countdown">Countdown</option>
            <option value="countup">Count Up</option>
          </select>
        </label>

        <label className={styles.field}>
          Sit/Stand Default Mode
          <select
            className={styles.select}
            value={settings.defaultSitStandMode ?? 'countdown'}
            onChange={(event) => {
              const defaultSitStandMode = event.target.value as 'countdown' | 'countup'
              setSettings({ defaultSitStandMode })
              window.electronAPI?.updateSettings({ defaultSitStandMode })
            }}
          >
            <option value="countdown">Countdown</option>
            <option value="countup">Count Up</option>
          </select>
        </label>

        <label className={styles.field}>
          Pomodoro Default Mode
          <select
            className={styles.select}
            value={settings.defaultPomodoroMode ?? 'countdown'}
            onChange={(event) => {
              const defaultPomodoroMode = event.target.value as 'countdown' | 'countup'
              setSettings({ defaultPomodoroMode })
              window.electronAPI?.updateSettings({ defaultPomodoroMode })
            }}
          >
            <option value="countdown">Countdown</option>
            <option value="countup">Count Up</option>
          </select>
        </label>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Alerts</h3>
        <label className={styles.field}>
          Global Alert Volume
          <input
            className={styles.range}
            type="range"
            min={0}
            max={100}
            value={settings.defaultAlertVolume ?? 80}
            onChange={(event) => {
              const defaultAlertVolume = Number(event.target.value)
              setSettings({ defaultAlertVolume })
              window.electronAPI?.updateSettings({ defaultAlertVolume })
            }}
          />
        </label>

        <div className={styles.field}>
          Global Alert Cues
          <div className={styles.alertCueList}>
            {(settings.defaultAlertCues || []).map((cue) => (
              <div key={cue.id} className={styles.alertCueRow}>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={99}
                  value={cue.thresholdPercent}
                  onChange={(event) =>
                    updateGlobalAlertCue(cue.id, {
                      thresholdPercent: Number(event.target.value),
                    })
                  }
                />
                <span className={styles.percentLabel}>%</span>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Sound file path"
                  value={cue.soundPath}
                  onChange={(event) =>
                    updateGlobalAlertCue(cue.id, { soundPath: event.target.value })
                  }
                />
                <button className={styles.smallButton} onClick={() => removeGlobalAlertCue(cue.id)}>
                  Remove
                </button>
              </div>
            ))}
            <button className={styles.smallButton} onClick={addGlobalAlertCue}>
              + Add Global Cue
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Mascot Defaults</h3>
        <label className={styles.field}>
          Mascot Image
          <input className={styles.fileInput} type="file" accept="image/*" onChange={handleMascotUpload} />
        </label>

        <label className={styles.field}>
          Mascot Size
          <input
            className={styles.range}
            type="range"
            min={60}
            max={220}
            value={settings.mascotSize ?? 100}
            onChange={(event) => {
              const mascotSize = Number(event.target.value)
              setSettings({ mascotSize })
              window.electronAPI?.updateSettings({ mascotSize })
            }}
          />
        </label>

        <label className={styles.field}>
          Mascot Scale
          <input
            className={styles.range}
            type="range"
            min={30}
            max={120}
            value={Math.round((settings.mascotScale ?? 0.65) * 100)}
            onChange={(event) => {
              const mascotScale = Number(event.target.value) / 100
              setSettings({ mascotScale })
              window.electronAPI?.updateSettings({ mascotScale })
            }}
          />
        </label>

        <label className={styles.field}>
          Mascot Position
          <select
            className={styles.select}
            value={settings.mascotPosition ?? 'top-right'}
            onChange={(event) => {
              const mascotPosition = event.target.value as
                | 'top-left'
                | 'top-right'
                | 'bottom-left'
                | 'bottom-right'
              setSettings({ mascotPosition })
              window.electronAPI?.updateSettings({ mascotPosition })
            }}
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </label>

        <div className={styles.field}>
          Global Mascot Animation Cues
          <div className={styles.alertCueList}>
            {(settings.defaultMascotAnimationCues || []).map((cue) => (
              <div key={cue.id} className={styles.alertCueRow}>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={1}
                  max={99}
                  value={cue.thresholdPercent}
                  onChange={(event) =>
                    updateGlobalMascotCue(cue.id, {
                      thresholdPercent: Number(event.target.value),
                    })
                  }
                />
                <span className={styles.percentLabel}>%</span>
                <select
                  className={styles.select}
                  value={cue.animation}
                  onChange={(event) =>
                    updateGlobalMascotCue(cue.id, {
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
                <button className={styles.smallButton} onClick={() => removeGlobalMascotCue(cue.id)}>
                  Remove
                </button>
              </div>
            ))}
            <button className={styles.smallButton} onClick={addGlobalMascotCue}>
              + Add Mascot Cue
            </button>
          </div>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            window.electronAPI?.exportAllStatsCsv()
          }}
        >
          Export All Stats CSV
        </button>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            window.electronAPI?.openLogs()
          }}
        >
          Open Logs
        </button>
        <button className={styles.closeButton} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel
