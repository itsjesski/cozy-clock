import type { ChangeEventHandler } from 'react'
import { BUILTIN_ALERT_SOUND_SOFT_CHIME } from '@shared/constants'
import styles from './TimerTile.module.css'
import type {
  AlertCue,
  ClockDisplayMode,
  MascotAnimationCue,
  MascotAnimationType,
  TimerConfig,
} from '../../../../../types'

type SettingsTab = 'general' | 'alerts' | 'mascot'
type BoolSetter = (value: boolean) => void
type NumberSetter = (value: number) => void
type MascotPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type TimerModeSetter = (mode: TimerConfig['mode']) => void

export interface TimerTileSettingsModalProps {
  isOpen: boolean
  activeSettingsTab: SettingsTab
  setActiveSettingsTab: (tab: SettingsTab) => void
  onClose: () => void
  onSave: () => void
  displayModeOptions: Array<Exclude<ClockDisplayMode, 'minimal'>>
  displayModeLabels: Record<Exclude<ClockDisplayMode, 'minimal'>, string>
  currentDisplayMode: ClockDisplayMode
  onDisplayModeChange: (mode: ClockDisplayMode) => void
  editableBorderColor: string
  setEditableBorderColor: (value: string) => void
  timerType: TimerConfig['type']
  editableTimerMode: TimerConfig['mode']
  setEditableTimerMode: TimerModeSetter
  editableDurationMinutes: number
  setEditableDurationMinutes: NumberSetter
  editableSitDurationMinutes: number
  setEditableSitDurationMinutes: NumberSetter
  editableStandDurationMinutes: number
  setEditableStandDurationMinutes: NumberSetter
  editableAutoAdvanceStages: boolean
  setEditableAutoAdvanceStages: BoolSetter
  editableWorkDurationMinutes: number
  setEditableWorkDurationMinutes: NumberSetter
  editableShortBreakMinutes: number
  setEditableShortBreakMinutes: NumberSetter
  editableLongBreakMinutes: number
  setEditableLongBreakMinutes: NumberSetter
  editablePomodoroRounds: number
  setEditablePomodoroRounds: NumberSetter
  editableContinueFromLastTime: boolean
  setEditableContinueFromLastTime: BoolSetter
  editableContinueWhileAppClosed: boolean
  setEditableContinueWhileAppClosed: BoolSetter
  showContinuityCatchupNote: boolean
  editableUseGlobalAlertVolume: boolean
  setEditableUseGlobalAlertVolume: BoolSetter
  editableAlertVolume: number
  setEditableAlertVolume: NumberSetter
  editableUseGlobalAlertCues: boolean
  setEditableUseGlobalAlertCues: BoolSetter
  editableAlertCues: AlertCue[]
  updateAlertCue: (cueId: string, updates: Partial<AlertCue>) => void
  browseAlertCueSound: (cueId: string) => void
  removeAlertCue: (cueId: string) => void
  addAlertCue: () => void
  editableUseGlobalTimerNotifications: boolean
  setEditableUseGlobalTimerNotifications: BoolSetter
  editableShowTimerNotifications: boolean
  setEditableShowTimerNotifications: BoolSetter
  editableUseGlobalFlashTaskbar: boolean
  setEditableUseGlobalFlashTaskbar: BoolSetter
  editableFlashTaskbar: boolean
  setEditableFlashTaskbar: BoolSetter
  editableUseGlobalMascotSettings: boolean
  setEditableUseGlobalMascotSettings: BoolSetter
  editableMascotImagePath: string
  setEditableMascotImagePath: (value: string) => void
  handleMascotUpload: ChangeEventHandler<HTMLInputElement>
  editableMascotSize: number
  setEditableMascotSize: NumberSetter
  editableMascotPosition: MascotPosition
  setEditableMascotPosition: (value: MascotPosition) => void
  editableUseGlobalMascotCues: boolean
  setEditableUseGlobalMascotCues: BoolSetter
  editableMascotAnimationCues: MascotAnimationCue[]
  updateMascotAnimationCue: (cueId: string, updates: Partial<MascotAnimationCue>) => void
  removeMascotAnimationCue: (cueId: string) => void
  addMascotAnimationCue: () => void
  mascotAnimationTypes: MascotAnimationType[]
}

export function TimerTileSettingsModal(props: TimerTileSettingsModalProps) {
  const {
    isOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    onClose,
    onSave,
    displayModeOptions,
    displayModeLabels,
    currentDisplayMode,
    onDisplayModeChange,
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
    showContinuityCatchupNote,
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
    mascotAnimationTypes,
  } = props
  const builtInSoftChimeLabel = 'Soft Chime (Built-in)'

  const parseNumberInput = (value: string): number | null => {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const renderNumberField = (
    label: string,
    value: number,
    setValue: (value: number) => void,
  ) => (
    <label className={styles.settingsField}>
      {label}
      <input
        className={styles.settingsNumberInput}
        type="number"
        min={1}
        value={value}
        onChange={(event) => {
          const parsed = parseNumberInput(event.target.value)
          if (parsed === null) return
          setValue(parsed)
        }}
      />
    </label>
  )

  const renderInfoToggle = (
    title: string,
    description: string,
    checked: boolean,
    setValue: (value: boolean) => void,
  ) => (
    <label className={styles.settingsOptionRow}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => setValue(event.target.checked)}
      />
      <span className={styles.settingsOptionText}>
        <span className={styles.settingsOptionTitle}>{title}</span>
        <span className={styles.settingsOptionDescription}>{description}</span>
      </span>
    </label>
  )

  const renderRangeField = (
    label: string,
    min: number,
    max: number,
    value: number,
    setValue: (value: number) => void,
  ) => (
    <label className={styles.settingsField}>
      {label}
      <input
        className={styles.settingsRangeInput}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
    </label>
  )

  if (!isOpen) return null

  return (
    <div className={styles.settingsOverlay} onClick={onClose}>
      <div className={styles.settingsModal} onClick={(event) => event.stopPropagation()}>
        <h4 className={styles.settingsTitle}>Timer Settings</h4>
        <div className={styles.settingsTabs}>
          <button
            className={`${styles.settingsTabButton} ${activeSettingsTab === 'general' ? styles.settingsTabButtonActive : ''}`}
            onClick={() => setActiveSettingsTab('general')}
          >
            General
          </button>
          <button
            className={`${styles.settingsTabButton} ${activeSettingsTab === 'alerts' ? styles.settingsTabButtonActive : ''}`}
            onClick={() => setActiveSettingsTab('alerts')}
          >
            Alerts
          </button>
          <button
            className={`${styles.settingsTabButton} ${activeSettingsTab === 'mascot' ? styles.settingsTabButtonActive : ''}`}
            onClick={() => setActiveSettingsTab('mascot')}
          >
            Mascot
          </button>
        </div>

        {activeSettingsTab === 'general' && (
          <>
            <section className={styles.settingsSection}>
              <h5 className={styles.settingsSectionTitle}>Display</h5>
              <label className={styles.settingsField}>
                Display Mode
                <select
                  className={styles.settingsSelect}
                  value={currentDisplayMode}
                  onChange={(event) => onDisplayModeChange(event.target.value as ClockDisplayMode)}
                >
                  {displayModeOptions.map((mode) => (
                    <option key={mode} value={mode}>
                      {displayModeLabels[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.settingsField}>
                Color
                <input
                  className={styles.settingsColorInput}
                  type="color"
                  value={editableBorderColor}
                  onChange={(event) => setEditableBorderColor(event.target.value)}
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
                renderNumberField('Duration (minutes)', editableDurationMinutes, setEditableDurationMinutes)
              )}

              {timerType === 'sit-stand' && (
                <>
                  {renderNumberField('Sit Duration (minutes)', editableSitDurationMinutes, setEditableSitDurationMinutes)}
                  {renderNumberField('Stand Duration (minutes)', editableStandDurationMinutes, setEditableStandDurationMinutes)}
                </>
              )}

              {timerType === 'pomodoro' && (
                <>
                  {renderNumberField('Work Duration (minutes)', editableWorkDurationMinutes, setEditableWorkDurationMinutes)}
                  {renderNumberField('Short Break (minutes)', editableShortBreakMinutes, setEditableShortBreakMinutes)}
                  {renderNumberField('Long Break (minutes)', editableLongBreakMinutes, setEditableLongBreakMinutes)}
                  {renderNumberField('Rounds Before Long Break', editablePomodoroRounds, setEditablePomodoroRounds)}
                </>
              )}

              {timerType !== 'generic' && (
                <label className={styles.settingsToggle}>
                  <input
                    type="checkbox"
                    checked={editableAutoAdvanceStages}
                    onChange={(event) => setEditableAutoAdvanceStages(event.target.checked)}
                  />
                  Automatically continue between stages
                </label>
              )}

              <div className={styles.settingsDivider} />
              <div className={styles.settingsSubsection}>
                <h6 className={styles.settingsSubsectionTitle}>Timer Continuity</h6>
                {renderInfoToggle(
                  'Restore saved time',
                  'Reopen at the last saved time.',
                  editableContinueFromLastTime,
                  setEditableContinueFromLastTime,
                )}
                {renderInfoToggle(
                  'Keep running while closed',
                  'Catch up based on real time.',
                  editableContinueWhileAppClosed,
                  setEditableContinueWhileAppClosed,
                )}
                {showContinuityCatchupNote && (
                  <p className={styles.settingsInfoPill}>
                    Paused timers restore. Running timers catch up.
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {activeSettingsTab === 'alerts' && (
          <>
            <section className={styles.settingsSection}>
              <h5 className={styles.settingsSectionTitle}>Alerts</h5>
              <label className={styles.settingsToggle}>
                <input
                  type="checkbox"
                  checked={editableUseGlobalTimerNotifications}
                  onChange={(event) => setEditableUseGlobalTimerNotifications(event.target.checked)}
                />
                Use global desktop notifications
              </label>
              {!editableUseGlobalTimerNotifications && (
                renderInfoToggle(
                  'Desktop notifications',
                  'Show a system notification when this timer or stage finishes.',
                  editableShowTimerNotifications,
                  setEditableShowTimerNotifications,
                )
              )}
              <label className={styles.settingsToggle}>
                <input
                  type="checkbox"
                  checked={editableUseGlobalFlashTaskbar}
                  onChange={(event) => setEditableUseGlobalFlashTaskbar(event.target.checked)}
                />
                Use global taskbar flash
              </label>
              {!editableUseGlobalFlashTaskbar && (
                renderInfoToggle(
                  'Taskbar flash',
                  'Flash the Windows taskbar button when this timer or stage finishes.',
                  editableFlashTaskbar,
                  setEditableFlashTaskbar,
                )
              )}
              <label className={styles.settingsToggle}>
                <input
                  type="checkbox"
                  checked={editableUseGlobalAlertVolume}
                  onChange={(event) => setEditableUseGlobalAlertVolume(event.target.checked)}
                />
                Use global alert volume
              </label>
              {!editableUseGlobalAlertVolume && (
                renderRangeField('Alert Volume', 0, 100, editableAlertVolume, setEditableAlertVolume)
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
                        <span className={styles.alertCueThresholdLabel}>Play sound at</span>
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          max={100}
                          value={cue.thresholdPercent}
                          onChange={(event) => {
                            const parsed = parseNumberInput(event.target.value)
                            if (parsed === null) return
                            updateAlertCue(cue.id, { thresholdPercent: parsed })
                          }}
                        />
                        <span className={styles.percentLabel}>% complete</span>
                      </div>
                      <input
                        className={styles.settingsInput}
                        type="text"
                        placeholder="Sound file path"
                        readOnly={cue.soundPath === BUILTIN_ALERT_SOUND_SOFT_CHIME}
                        value={
                          cue.soundPath === BUILTIN_ALERT_SOUND_SOFT_CHIME
                            ? builtInSoftChimeLabel
                            : cue.soundPath
                        }
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
          </>
        )}

        {activeSettingsTab === 'mascot' && (
          <>
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
                  {renderRangeField('Mascot Size', 60, 220, editableMascotSize, setEditableMascotSize)}
                  <label className={styles.settingsField}>
                    Mascot Position
                    <select
                      className={styles.settingsSelect}
                      value={editableMascotPosition}
                      onChange={(event) =>
                        setEditableMascotPosition(event.target.value as MascotPosition)
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
                    <div key={cue.id} className={styles.alertCueCard}>
                      <div className={styles.alertCueThresholdRow}>
                        <span className={styles.alertCueThresholdLabel}>Play animation at</span>
                        <input
                          className={styles.settingsNumberInput}
                          type="number"
                          min={1}
                          max={100}
                          value={cue.thresholdPercent}
                          onChange={(event) => {
                            const parsed = parseNumberInput(event.target.value)
                            if (parsed === null) return
                            updateMascotAnimationCue(cue.id, {
                              thresholdPercent: parsed,
                            })
                          }}
                        />
                        <span className={styles.percentLabel}>% complete</span>
                      </div>
                      <div className={styles.alertCueActionsRow}>
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
          <button className={styles.settingsCloseButton} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}