import { useState, type ChangeEventHandler } from 'react'
import { generateId } from '@shared/utils'
import {
  AVAILABLE_THEMES,
  BUILTIN_ALERT_SOUND_SOFT_CHIME,
  DEFAULT_ALERT_VOLUME,
  THEME_LABELS,
} from '@shared/constants'
import { fileToDataUrl } from '../../../../utils/fileToDataUrl'
import { appendItem, removeById, updateById } from '../../utils/listOps'
import {
  DEFAULT_SERVER_PORT,
  MIN_SERVER_PORT,
  MAX_SERVER_PORT,
  parseServerPort,
} from '@shared/serverPort'
import { useSettingsUpdater } from '../../hooks/useSettingsUpdater'
import { useGlobalStore } from '../../../../store/globalStore'
import type { AlertCue, MascotAnimationCue, MascotAnimationType } from '../../../../../types'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const settings = useGlobalStore((state) => state.settings)
  const applySettingsUpdate = useSettingsUpdater()
  const [activeTab, setActiveTab] = useState<'general' | 'alerts' | 'mascot'>('general')

  const mascotAnimationTypes: MascotAnimationType[] = ['shake', 'wiggle', 'bounce']
  const builtInSoftChimeLabel = 'Soft Chime (Built-in)'

  const parseNumberInput = (value: string): number | null => {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const clampThreshold = (value: number) => Math.max(1, Math.min(100, value))

  const updateGlobalAlertCue = (cueId: string, updates: Partial<AlertCue>) => {
    const normalized = updates.thresholdPercent === undefined
      ? updates
      : { ...updates, thresholdPercent: clampThreshold(updates.thresholdPercent) }
    const next = updateById(settings.defaultAlertCues || [], cueId, normalized)
    applySettingsUpdate({ defaultAlertCues: next })
  }

  const addGlobalAlertCue = () => {
    const next = appendItem(settings.defaultAlertCues || [], {
      id: generateId(),
      thresholdPercent: 50,
      soundPath: '',
    })
    applySettingsUpdate({ defaultAlertCues: next })
  }

  const removeGlobalAlertCue = (cueId: string) => {
    const next = removeById(settings.defaultAlertCues || [], cueId)
    applySettingsUpdate({ defaultAlertCues: next })
  }

  const browseGlobalAlertCueSound = async (cueId: string) => {
    try {
      const result = await window.electronAPI?.pickSoundFile()
      if (!result?.success || !result.filePath) return
      updateGlobalAlertCue(cueId, { soundPath: result.filePath })
    } catch (error) {
      console.error('Error selecting global alert sound file:', error)
    }
  }

  const updateGlobalMascotCue = (cueId: string, updates: Partial<MascotAnimationCue>) => {
    const normalized = updates.thresholdPercent === undefined
      ? updates
      : { ...updates, thresholdPercent: clampThreshold(updates.thresholdPercent) }
    const next = updateById(settings.defaultMascotAnimationCues || [], cueId, normalized)
    applySettingsUpdate({ defaultMascotAnimationCues: next })
  }

  const addGlobalMascotCue = () => {
    const next = appendItem(settings.defaultMascotAnimationCues || [], {
      id: generateId(),
      thresholdPercent: 50,
      animation: 'wiggle' as MascotAnimationType,
    })
    applySettingsUpdate({ defaultMascotAnimationCues: next })
  }

  const removeGlobalMascotCue = (cueId: string) => {
    const next = removeById(settings.defaultMascotAnimationCues || [], cueId)
    applySettingsUpdate({ defaultMascotAnimationCues: next })
  }

  const handleMascotUpload: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    fileToDataUrl(file)
      .then((mascotImagePath) => applySettingsUpdate({ mascotImagePath }))
      .catch((error) => console.error('Error reading mascot file:', error))
  }

  const timerModeFields: Array<{ label: string; key: 'defaultGenericMode' | 'defaultSitStandMode' | 'defaultPomodoroMode'; value: 'countdown' | 'countup' }> = [
    {
      label: 'Generic Default Mode',
      key: 'defaultGenericMode',
      value: settings.defaultGenericMode ?? 'countdown',
    },
    {
      label: 'Sit/Stand Default Mode',
      key: 'defaultSitStandMode',
      value: settings.defaultSitStandMode ?? 'countdown',
    },
    {
      label: 'Pomodoro Default Mode',
      key: 'defaultPomodoroMode',
      value: settings.defaultPomodoroMode ?? 'countdown',
    },
  ]

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'general' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'alerts' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'mascot' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('mascot')}
        >
          Mascot
        </button>
      </div>

      {activeTab === 'general' && (
        <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <label className={styles.field}>
          Theme
          <select
            className={styles.select}
            value={settings.theme}
            onChange={(event) => {
              const theme = event.target.value
              applySettingsUpdate({ theme })
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
              applySettingsUpdate({ alwaysOnTop })
            }}
          />
          Always On Top
        </label>

        <label className={styles.field}>
          Server Port
          <input
            className={styles.numberInput}
            type="number"
            min={MIN_SERVER_PORT}
            max={MAX_SERVER_PORT}
            value={settings.serverPort ?? DEFAULT_SERVER_PORT}
            onChange={(event) => {
              const serverPort = parseServerPort(
                event.target.value,
                settings.serverPort ?? DEFAULT_SERVER_PORT,
              )
              applySettingsUpdate({ serverPort })
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
                applySettingsUpdate({ defaultContinueFromLastTime })
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
                applySettingsUpdate({ defaultContinueWhileAppClosed })
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
        {timerModeFields.map((modeField) => (
          <label key={modeField.key} className={styles.field}>
            {modeField.label}
            <select
              className={styles.select}
              value={modeField.value}
              onChange={(event) => applySettingsUpdate({
                [modeField.key]: event.target.value as 'countdown' | 'countup',
              })}
            >
              <option value="countdown">Countdown</option>
              <option value="countup">Count Up</option>
            </select>
          </label>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Stage Transitions</h3>
        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={settings.defaultAutoAdvanceStages ?? true}
            onChange={(event) => {
              const defaultAutoAdvanceStages = event.target.checked
              applySettingsUpdate({ defaultAutoAdvanceStages })
            }}
          />
          Automatically continue between stages
        </label>
      </section>

        </>
      )}

      {activeTab === 'alerts' && (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Alerts</h3>
        <label className={styles.field}>
          Global Alert Volume
          <input
            className={styles.range}
            type="range"
            min={0}
            max={100}
            value={settings.defaultAlertVolume ?? DEFAULT_ALERT_VOLUME}
            onChange={(event) => {
              const defaultAlertVolume = Number(event.target.value)
              applySettingsUpdate({ defaultAlertVolume })
            }}
          />
        </label>

        <div className={styles.field}>
          Global Alert Cues
          <div className={styles.alertCueList}>
            {(settings.defaultAlertCues || []).map((cue) => (
              <div key={cue.id} className={styles.alertCueCard}>
                <div className={styles.alertCueThresholdRow}>
                  <span className={styles.alertCueThresholdLabel}>Play sound at</span>
                  <input
                    className={styles.numberInput}
                    type="number"
                    min={1}
                    max={100}
                    value={cue.thresholdPercent}
                    onChange={(event) => {
                      const parsed = parseNumberInput(event.target.value)
                      if (parsed === null) return
                      updateGlobalAlertCue(cue.id, {
                        thresholdPercent: parsed,
                      })
                    }}
                  />
                  <span className={styles.percentLabel}>% complete</span>
                </div>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Sound file path"
                  readOnly={cue.soundPath === BUILTIN_ALERT_SOUND_SOFT_CHIME}
                  value={
                    cue.soundPath === BUILTIN_ALERT_SOUND_SOFT_CHIME
                      ? builtInSoftChimeLabel
                      : cue.soundPath
                  }
                  onChange={(event) =>
                    updateGlobalAlertCue(cue.id, { soundPath: event.target.value })
                  }
                />
                <div className={styles.alertCueActionsRow}>
                  <button
                    type="button"
                    className={`${styles.smallButton} ${styles.cueBrowseButton}`}
                    onClick={() => browseGlobalAlertCueSound(cue.id)}
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => removeGlobalAlertCue(cue.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button className={styles.smallButton} onClick={addGlobalAlertCue}>
              + Add Global Cue
            </button>
          </div>
        </div>
      </section>

      )}

      {activeTab === 'mascot' && (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Mascot Defaults</h3>
        <div className={styles.field}>
          Mascot Image
          <div className={styles.mascotUploadContainer}>
            {settings.mascotImagePath && (
              <div className={styles.mascotPreviewWrapper}>
                <img
                  src={settings.mascotImagePath}
                  alt="Current mascot"
                  className={styles.mascotPreview}
                />
                <button
                  className={styles.clearButton}
                  onClick={() => applySettingsUpdate({ mascotImagePath: '' })}
                >
                  Clear
                </button>
              </div>
            )}
            <label className={styles.fileInputLabel}>
              <input
                className={styles.fileInput}
                type="file"
                accept="image/*"
                onChange={handleMascotUpload}
              />
              <span className={styles.fileInputButton}>
                {settings.mascotImagePath ? 'Change Mascot' : 'Choose File'}
              </span>
            </label>
          </div>
        </div>

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
              applySettingsUpdate({ mascotSize })
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
              applySettingsUpdate({ mascotPosition })
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
              <div key={cue.id} className={styles.alertCueCard}>
                <div className={styles.alertCueThresholdRow}>
                  <span className={styles.alertCueThresholdLabel}>Play animation at</span>
                  <input
                    className={styles.numberInput}
                    type="number"
                    min={1}
                    max={100}
                    value={cue.thresholdPercent}
                    onChange={(event) => {
                      const parsed = parseNumberInput(event.target.value)
                      if (parsed === null) return
                      updateGlobalMascotCue(cue.id, {
                        thresholdPercent: parsed,
                      })
                    }}
                  />
                  <span className={styles.percentLabel}>% complete</span>
                </div>
                <div className={styles.alertCueActionsRow}>
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
              </div>
            ))}
            <button className={styles.smallButton} onClick={addGlobalMascotCue}>
              + Add Mascot Cue
            </button>
          </div>
        </div>
      </section>

      )}

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
