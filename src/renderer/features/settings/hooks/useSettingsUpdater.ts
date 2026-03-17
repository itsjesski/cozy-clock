import { useCallback, useRef } from 'react'
import type { AppSettings } from '../../../../types'
import { useGlobalStore } from '../../../store/globalStore'

export function useSettingsUpdater(): (updates: Partial<AppSettings>) => void {
  const setSettings = useGlobalStore((state) => state.setSettings)
  const requestIdRef = useRef(0)

  return useCallback(
    (updates: Partial<AppSettings>) => {
      const requestId = ++requestIdRef.current

      const syncSettings = async () => {
        try {
          const response = await window.electronAPI?.updateSettings(updates)
          if (!response?.success || !response.data) {
            return
          }

          if (requestId === requestIdRef.current) {
            setSettings(response.data)
          }
        } catch {
          // Ignore transient IPC failures during hot reload.
        }
      }

      void syncSettings()
    },
    [setSettings],
  )
}
