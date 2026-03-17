/**
 * Timer Zustand store factory
 * Creates a store for each timer
 */

import { create, StoreApi } from 'zustand'
import type { TimerState } from '../../../../types'

interface TimerStoreState {
  state: TimerState
  updateState: (updates: Partial<TimerState>) => void
}

type TimerStore = StoreApi<TimerStoreState>

// Map to hold all timer stores by ID
const timerStores = new Map<string, TimerStore>()

export function createTimerStore(timerId: string): TimerStore {
  if (timerStores.has(timerId)) {
    return timerStores.get(timerId)!
  }

  const store = create<TimerStoreState>((set) => ({
    state: {
      id: timerId,
      phase: 'idle',
      timeElapsed: 0,
      timeRemaining: 0,
      lastUpdatedAt: Date.now(),
    },
    updateState: (updates) =>
      set((state) => ({
        state: { ...state.state, ...updates },
      })),
  }))

  timerStores.set(timerId, store)
  return store
}
