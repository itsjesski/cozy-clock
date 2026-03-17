import type { AppSettings, MascotAnimationCue } from '../types'
import { DEFAULT_THEME } from './constants'
import { DEFAULT_SERVER_PORT } from './serverPort'

const DEFAULT_MASCOT_CUES: MascotAnimationCue[] = [
  { id: 'default-mascot-50', thresholdPercent: 50, animation: 'wiggle' },
]

export function createDefaultAppSettings(): AppSettings {
  return {
    theme: DEFAULT_THEME,
    defaultAlertCues: [],
    defaultAlertVolume: 80,
    defaultMascotAnimationCues: DEFAULT_MASCOT_CUES.map((cue) => ({ ...cue })),
    alwaysOnTop: false,
    compactMode: false,

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
    serverPort: DEFAULT_SERVER_PORT,
  }
}
