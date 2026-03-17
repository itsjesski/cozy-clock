import React from 'react'
import type { TimerMode, TimerType } from '../../../../../types'
import type { CreateTimerFormState } from '../../hooks/useCreateTimerForm'
import styles from './Dashboard.module.css'

interface CreateTimerModalProps {
  isOpen: boolean
  form: CreateTimerFormState
  setFormField: <K extends keyof CreateTimerFormState>(
    key: K,
    value: CreateTimerFormState[K],
  ) => void
  onCancel: () => void
  onCreate: () => void
}

export const CreateTimerModal: React.FC<CreateTimerModalProps> = ({
  isOpen,
  form,
  setFormField,
  onCancel,
  onCreate,
}) => {
  if (!isOpen) return null

  return (
    <div className={`${styles.settingsOverlay} ${styles.lockedOverlay}`}>
      <div className={styles.updateModal} role="dialog" aria-modal="true" aria-label="Create timer">
        <h3 className={styles.updateModalTitle}>Create Timer</h3>

        <label className={styles.modalField}>
          Timer Type
          <select aria-label="Timer type" value={form.timerType} onChange={(event) => setFormField('timerType', event.target.value as TimerType)}>
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
            value={form.timerLabel}
            onChange={(event) => setFormField('timerLabel', event.target.value)}
            placeholder="Optional custom label"
          />
        </label>

        {form.timerType === 'generic' && (
          <>
            <label className={styles.modalField}>
              Mode
              <select aria-label="Generic timer mode" value={form.timerMode} onChange={(event) => setFormField('timerMode', event.target.value as TimerMode)}>
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
                value={form.genericMinutes}
                onChange={(event) => setFormField('genericMinutes', Number(event.target.value))}
              />
            </label>
          </>
        )}

        {form.timerType === 'sit-stand' && (
          <>
            <label className={styles.modalField}>
              Sit Duration (minutes)
              <input
                type="number"
                aria-label="Sit duration minutes"
                min={1}
                value={form.sitMinutes}
                onChange={(event) => setFormField('sitMinutes', Number(event.target.value))}
              />
            </label>
            <label className={styles.modalField}>
              Stand Duration (minutes)
              <input
                type="number"
                aria-label="Stand duration minutes"
                min={1}
                value={form.standMinutes}
                onChange={(event) => setFormField('standMinutes', Number(event.target.value))}
              />
            </label>
          </>
        )}

        {form.timerType === 'pomodoro' && (
          <>
            <label className={styles.modalField}>
              Work (minutes)
              <input
                type="number"
                aria-label="Pomodoro work minutes"
                min={1}
                value={form.workMinutes}
                onChange={(event) => setFormField('workMinutes', Number(event.target.value))}
              />
            </label>
            <label className={styles.modalField}>
              Short Break (minutes)
              <input
                type="number"
                aria-label="Pomodoro short break minutes"
                min={1}
                value={form.shortBreakMinutes}
                onChange={(event) => setFormField('shortBreakMinutes', Number(event.target.value))}
              />
            </label>
            <label className={styles.modalField}>
              Long Break (minutes)
              <input
                type="number"
                aria-label="Pomodoro long break minutes"
                min={1}
                value={form.longBreakMinutes}
                onChange={(event) => setFormField('longBreakMinutes', Number(event.target.value))}
              />
            </label>
            <label className={styles.modalField}>
              Rounds Before Long Break
              <input
                type="number"
                aria-label="Pomodoro rounds before long break"
                min={1}
                value={form.pomodoroRounds}
                onChange={(event) => setFormField('pomodoroRounds', Number(event.target.value))}
              />
            </label>
          </>
        )}

        <div className={styles.updateActions}>
          <button className={styles.settingsButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.installButton} onClick={onCreate}>
            Add Timer
          </button>
        </div>
      </div>
    </div>
  )
}