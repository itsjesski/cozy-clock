import React from 'react'
import styles from './Dashboard.module.css'

interface UpdaterModalProps {
  isOpen: boolean
  isUpdateReady: boolean
  updateProgress: number
  updateStatus: string
  updateError: string | null
  isDownloadingUpdate: boolean
  onInstall: () => void
  onClose: () => void
}

export const UpdaterModal: React.FC<UpdaterModalProps> = ({
  isOpen,
  isUpdateReady,
  updateProgress,
  updateStatus,
  updateError,
  isDownloadingUpdate,
  onInstall,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div className={styles.settingsOverlay} onClick={onClose}>
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
            <button className={styles.installButton} onClick={onInstall}>
              Install and Restart
            </button>
          ) : (
            <button className={styles.settingsButton} disabled={isDownloadingUpdate}>
              {isDownloadingUpdate ? 'Downloading...' : 'Waiting...'}
            </button>
          )}
          <button className={styles.settingsButton} onClick={onClose}>
            {isUpdateReady ? 'Later' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}