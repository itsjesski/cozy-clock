import { useEffect, useState } from 'react'
import { createTimerStore } from '../store/timerStore'
import { useIpcSubscription } from '../../../hooks/useIpcSubscription'
import { getPhaseTotalSeconds, getResolvedPhaseLabel } from '@shared/timerPhase'
import type { MascotAnimationType, TimerConfig, TimerState } from '../../../../types'

interface UseTimerTileRuntimeParams {
  id: string
  timerType: TimerConfig['type']
  timerMode: TimerConfig['mode']
  duration?: number
  sitDuration?: number
  standDuration?: number
  workDuration?: number
  shortBreakDuration?: number
  longBreakDuration?: number
}

export function useTimerTileRuntime({
  id,
  timerType,
  timerMode,
  duration,
  sitDuration,
  standDuration,
  workDuration,
  shortBreakDuration,
  longBreakDuration,
}: UseTimerTileRuntimeParams) {
  const getCurrentPhaseTotal = (phaseLabel?: string) =>
    getPhaseTotalSeconds(
      {
        type: timerType,
        mode: timerMode,
        duration,
        sitDuration,
        standDuration,
        workDuration,
        shortBreakDuration,
        longBreakDuration,
      },
      phaseLabel,
    )

  const [state, setState] = useState<TimerState>({
    id,
    phase: 'idle',
    timeElapsed: 0,
    timeRemaining: getCurrentPhaseTotal(),
    currentPhaseLabel: getResolvedPhaseLabel(timerType, timerMode),
    lastUpdatedAt: Date.now(),
  })
  const [mascotAnimationType, setMascotAnimationType] = useState<MascotAnimationType | null>(null)
  const [mascotAnimationNonce, setMascotAnimationNonce] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const timerStore = createTimerStore(id)

  const hydrateTimerState = async () => {
    try {
      const result = await window.electronAPI?.getTimerState(id)
      return result?.success ? result.data : null
    } catch {
      return null
    }
  }

  useEffect(() => {
    const handleStateChange = () => {
      const currentState = timerStore.getState()
      setState(currentState.state)
    }

    const unsubscribe = timerStore.subscribe(handleStateChange)
    return () => unsubscribe()
  }, [timerStore])

  useIpcSubscription(() => {
    const handleTimerTick = (data: any) => {
      if (data?.id === id) {
        setState((prev) => ({
          ...prev,
          phase: data.phase ?? prev.phase,
          timeElapsed: data.timeElapsed ?? prev.timeElapsed,
          timeRemaining: data.timeRemaining ?? prev.timeRemaining,
          currentPhaseLabel: data.currentPhaseLabel,
          lastUpdatedAt: Date.now(),
        }))
      }
    }

    return window.electronAPI?.onTimerTick(handleTimerTick)
  }, [id])

  useIpcSubscription(() => {
    const handleMascotAnimate = (data: { id?: string; animation?: MascotAnimationType }) => {
      if (data?.id !== id || !data.animation) return
      setMascotAnimationType(data.animation)
      setMascotAnimationNonce((value) => value + 1)
    }

    return window.electronAPI?.onMascotAnimate(handleMascotAnimate)
  }, [id])

  useIpcSubscription(() => {
    const handleTimerStateUpdate = (data: { states?: Record<string, TimerState> }) => {
      const nextState = data?.states?.[id]
      if (!nextState) return
      setState(nextState)
    }

    return window.electronAPI?.onTimerStateUpdate(handleTimerStateUpdate)
  }, [id])

  useEffect(() => {
    let isDisposed = false

    hydrateTimerState().then((nextState) => {
      if (!isDisposed && nextState) {
        setState(nextState)
      }
    })

    return () => {
      isDisposed = true
    }
  }, [id])

  const runTimerAction = async (action: () => Promise<void>) => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayPause = async () => {
    await runTimerAction(async () => {
      try {
        if (state.phase === 'running') {
          await window.electronAPI?.pauseTimer(id)
          setState((prev) => ({ ...prev, phase: 'paused' }))
          return
        }

        if (state.phase === 'paused') {
          await window.electronAPI?.resumeTimer(id)
          setState((prev) => ({ ...prev, phase: 'running' }))
          return
        }

        await window.electronAPI?.startTimer(id)
        setState((prev) => ({ ...prev, phase: 'running' }))
      } catch (error) {
        console.error('Error toggling timer:', error)
      }
    })
  }

  const handleReset = async (afterReset?: () => Promise<void> | void) => {
    await runTimerAction(async () => {
      try {
        await window.electronAPI?.resetTimer(id)
        setState((prev) => ({
          ...prev,
          phase: 'idle',
          timeElapsed: 0,
          timeRemaining: getCurrentPhaseTotal(prev.currentPhaseLabel),
          currentPhaseLabel: getResolvedPhaseLabel(timerType, timerMode, prev.currentPhaseLabel),
          lastUpdatedAt: Date.now(),
        }))
        await afterReset?.()
      } catch (error) {
        console.error('Error resetting timer:', error)
      }
    })
  }

  return {
    state,
    setState,
    isLoading,
    mascotAnimationType,
    mascotAnimationNonce,
    getCurrentPhaseTotal,
    handlePlayPause,
    handleReset,
  }
}