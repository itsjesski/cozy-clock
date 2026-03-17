import { useEffect } from 'react'
import type { DependencyList } from 'react'

type Unsubscribe = (() => void) | undefined

export function useIpcSubscription(
  subscribe: () => Unsubscribe,
  deps: DependencyList,
): void {
  useEffect(() => {
    const unsubscribe = subscribe()
    return () => {
      unsubscribe?.()
    }
  }, deps)
}
