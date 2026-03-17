import type { TimerPhase } from '../../../../types'

export function getPlayPauseLabel(phase: TimerPhase): 'Start' | 'Pause' | 'Resume' {
  if (phase === 'running') return 'Pause'
  if (phase === 'paused') return 'Resume'
  return 'Start'
}
