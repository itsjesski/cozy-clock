/**
 * Root React component
 */

import React, { useEffect } from 'react'
import { Dashboard } from './features/timers/components/Dashboard/Dashboard'
import { useGlobalStore } from './store/globalStore'
import { Howl } from 'howler'
import { DEFAULT_THEME, LEGACY_THEME_MAP } from '@shared/constants'
import './app.css'

export const App: React.FC = () => {
  const settings = useGlobalStore((state) => state.settings)
  const setSettings = useGlobalStore((state) => state.setSettings)

  const normalizeSettings = (incoming: any) => {
    const rawTheme = String(incoming?.theme || '')
    // First, check if it's a legacy theme name that needs mapping
    const mappedTheme = LEGACY_THEME_MAP[rawTheme]
    // Use mapped theme if available, otherwise use raw theme, fallback to default if invalid
    const normalizedTheme = mappedTheme || rawTheme || DEFAULT_THEME
    return {
      ...incoming,
      theme: normalizedTheme,
      __rawTheme: rawTheme,
    }
  }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await window.electronAPI?.getSettings()
        if (response?.success && response.data) {
          const normalized = normalizeSettings(response.data)
          const { __rawTheme: rawTheme, ...nextSettings } = normalized
          setSettings(nextSettings)

          if (nextSettings.theme !== rawTheme) {
            window.electronAPI?.updateSettings({ theme: nextSettings.theme })
          }
        }
      } catch {
        // Ignore transient startup IPC errors during hot reload
      }
    }

    loadSettings()
  }, [setSettings])

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onSettingsUpdate((payload: { settings?: unknown }) => {
      if (!payload?.settings) return
      const normalized = normalizeSettings(payload.settings)
      const { __rawTheme: _rawTheme, ...nextSettings } = normalized
      setSettings(nextSettings)
    })

    return () => {
      unsubscribe?.()
    }
  }, [setSettings])

  useEffect(() => {
    // Apply theme from settings
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  useEffect(() => {
    const onTimerAlert = (data: { soundPath?: string; volume?: number }) => {
      if (!data?.soundPath) return

      const playAlertSound = async () => {
        const resolved = await window.electronAPI?.resolveSoundSource(data.soundPath!)
        const source = resolved?.success && resolved.source
          ? resolved.source
          : data.soundPath!

        const sound = new Howl({
          src: [source],
          volume: Math.max(0, Math.min(1, (data.volume ?? 80) / 100)),
          html5: true,
        })

        sound.play()
      }

      void playAlertSound()
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
