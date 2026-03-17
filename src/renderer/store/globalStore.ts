/**
 * Global Zustand store for app-wide state
 */

import { create } from 'zustand'
import type { AppSettings } from '../../types'
import { createDefaultAppSettings } from '@shared/defaultSettings'

interface GlobalState {
  settings: AppSettings
  isStreamerMode: boolean
  setSettings: (settings: Partial<AppSettings>) => void
  toggleStreamerMode: () => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  settings: createDefaultAppSettings(),
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
