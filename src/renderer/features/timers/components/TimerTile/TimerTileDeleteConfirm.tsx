import styles from './TimerTile.module.css'

interface TimerTileDeleteConfirmProps {
  isOpen: boolean
  label: string
  onDelete: () => void
  onCancel: () => void
}

export function TimerTileDeleteConfirm({
  isOpen,
  label,
  onDelete,
  onCancel,
}: TimerTileDeleteConfirmProps) {
  if (!isOpen) return null

  return (
    <div className={styles.settingsOverlay} onClick={onCancel}>
      <div
        className={styles.confirmModal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete timer confirmation"
      >
        <h4 className={styles.settingsTitle}>Delete Timer?</h4>
        <p className={styles.settingsHelpText}>
          This will permanently remove {label || 'this timer'}.
        </p>
        <div className={styles.settingsActions}>
          <button className={styles.settingsDeleteButton} onClick={onDelete}>
            Delete
          </button>
          <button className={styles.settingsCloseButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}