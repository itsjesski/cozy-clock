/**
 * Root React component
 */

import React, { useEffect } from 'react'
import { Dashboard } from './components/Dashboard/Dashboard'
import { useGlobalStore } from './store/globalStore'
import { Howl } from 'howler'
import { DEFAULT_THEME, LEGACY_THEME_MAP } from '@shared/constants'
import './app.css'

export const App: React.FC = () => {
  const settings = useGlobalStore((state) => state.settings)
  const setSettings = useGlobalStore((state) => state.setSettings)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await window.electronAPI?.getSettings()
        if (response?.success && response.data) {
          const rawTheme = String(response.data.theme || '')
          const normalizedTheme = LEGACY_THEME_MAP[rawTheme] || DEFAULT_THEME
          const nextSettings = {
            ...response.data,
            theme: normalizedTheme,
          }
          setSettings(nextSettings)

          if (normalizedTheme !== rawTheme) {
            window.electronAPI?.updateSettings({ theme: normalizedTheme })
          }
        }
      } catch {
        // Ignore transient startup IPC errors during hot reload
      }
    }

    loadSettings()
  }, [setSettings])

  useEffect(() => {
    // Apply theme from settings
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  useEffect(() => {
    const onTimerAlert = (data: { soundPath?: string; volume?: number }) => {
      if (!data?.soundPath) return

      const sound = new Howl({
        src: [data.soundPath],
        volume: Math.max(0, Math.min(1, (data.volume ?? 80) / 100)),
        html5: true,
      })

      sound.play()
    }

    const unsubscribe = window.electronAPI?.onTimerAlert(onTimerAlert)

    return () => {
      unsubscribe?.()
    }
  }, [])

  return (
    <div className="app">
      <Dashboard />
    </div>
  )
}

export default App
