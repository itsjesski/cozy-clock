import { useEffect, useState } from 'react'
import { useIpcSubscription } from '../../../hooks/useIpcSubscription'

export function useUpdaterModal() {
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

  useEffect(() => {
    let isDisposed = false

    const hydrateUpdateStatus = async () => {
      try {
        const result = await window.electronAPI?.getUpdateStatus()
        if (!result?.success || !result.data || isDisposed) {
          return
        }

        const data = result.data as {
          isUpdateAvailable?: boolean
          isDownloadingUpdate?: boolean
          isUpdateReady?: boolean
          updateProgress?: number
          updateError?: string | null
        }

        setIsUpdateAvailable(Boolean(data.isUpdateAvailable))
        setIsDownloadingUpdate(Boolean(data.isDownloadingUpdate))
        setIsUpdateReady(Boolean(data.isUpdateReady))
        setUpdateProgress(Math.max(0, Math.min(100, Math.round(data.updateProgress || 0))))
        setUpdateError(data.updateError ?? null)

        if (data.isUpdateReady) {
          setUpdateStatus('Download complete!')
        } else if (data.isDownloadingUpdate) {
          const percent = Math.max(0, Math.min(100, Math.round(data.updateProgress || 0)))
          setUpdateStatus(`Downloading... ${percent}%`)
        }
      } catch {
        // Ignore transient startup IPC errors.
      }
    }

    void hydrateUpdateStatus()

    return () => {
      isDisposed = true
    }
  }, [])

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

  return {
    isUpdateAvailable,
    isUpdateModalOpen,
    isDownloadingUpdate,
    isUpdateReady,
    updateProgress,
    updateStatus,
    updateError,
    handleOpenUpdateModal,
    handleInstallUpdate,
    closeUpdateModal: () => setIsUpdateModalOpen(false),
  }
}