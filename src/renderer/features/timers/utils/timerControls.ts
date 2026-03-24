import type { TimerPhase } from '../../../../types'

export function getPlayPauseLabel(
  phase: TimerPhase,
  options?: { restart?: boolean },
): 'Start' | 'Pause' | 'Resume' | 'Restart' {
  if (options?.restart) return 'Restart'
  if (phase === 'running') return 'Pause'
  if (phase === 'paused') return 'Resume'
  return 'Start'
}
