/**
 * Global Zustand store for app-wide state
 */

import { create } from 'zustand'
import type { AppSettings } from '../../types'
import { DEFAULT_THEME } from '@shared/constants'

interface GlobalState {
  settings: AppSettings
  isStreamerMode: boolean
  setSettings: (settings: Partial<AppSettings>) => void
  toggleStreamerMode: () => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  settings: {
    theme: DEFAULT_THEME,
    defaultAlertCues: [],
    defaultAlertVolume: 80,
    defaultMascotAnimationCues: [
      { id: 'default-mascot-50', thresholdPercent: 50, animation: 'wiggle' },
    ],
    alwaysOnTop: false,
    compactMode: false,
    minimizeToTray: true,
    defaultContinueFromLastTime: false,
    defaultContinueWhileAppClosed: false,
    mascotSize: 100,
    mascotScale: 0.65,
    mascotPosition: 'top-right',
    enableInspirationMessages: true,
    autoResetStatsSchedule: 'never',
    defaultGenericMode: 'countdown',
    defaultSitStandMode: 'countdown',
    defaultPomodoroMode: 'countdown',
    serverPort: 5173,
  },
  isStreamerMode: false,
  setSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
  toggleStreamerMode: () =>
    set((state) => ({
      isStreamerMode: !state.isStreamerMode,
    })),
}))
