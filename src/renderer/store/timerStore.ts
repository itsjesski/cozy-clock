/**
 * Timer Zustand store factory
 * Creates a store for each timer
 */

import { create, StoreApi } from 'zustand'
import type { TimerState, TimerPhase } from '../../types'

interface TimerStoreState {
  state: TimerState
  setPhase: (phase: TimerPhase) => void
  setTimeElapsed: (elapsed: number) => void
  setTimeRemaining: (remaining: number) => void
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
    setPhase: (phase) =>
      set((state) => ({
        state: { ...state.state, phase },
      })),
    setTimeElapsed: (elapsed) =>
      set((state) => ({
        state: { ...state.state, timeElapsed: elapsed },
      })),
    setTimeRemaining: (remaining) =>
      set((state) => ({
        state: { ...state.state, timeRemaining: remaining },
      })),
    updateState: (updates) =>
      set((state) => ({
        state: { ...state.state, ...updates },
      })),
  }))

  timerStores.set(timerId, store)
  return store
}

export function getTimerStore(timerId: string): TimerStore | undefined {
  return timerStores.get(timerId)
}

export function deleteTimerStore(timerId: string): void {
  timerStores.delete(timerId)
}

export function getAllTimerStores(): Array<[string, TimerStore]> {
  return Array.from(timerStores.entries())
}
