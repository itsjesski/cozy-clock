import type { AlertCue, AppSettings, MascotAnimationCue } from '../types'
import {
  BUILTIN_ALERT_SOUND_SOFT_CHIME,
  DEFAULT_ALERT_VOLUME,
  DEFAULT_THEME,
} from './constants'
import { DEFAULT_SERVER_PORT } from './serverPort'

const DEFAULT_ALERT_CUES: AlertCue[] = [
  {
    id: 'default-alert-soft-chime',
    thresholdPercent: 100,
    soundPath: BUILTIN_ALERT_SOUND_SOFT_CHIME,
  },
]

const DEFAULT_MASCOT_CUES: MascotAnimationCue[] = [
  { id: 'default-mascot-25', thresholdPercent: 25, animation: 'wiggle' },
  { id: 'default-mascot-50', thresholdPercent: 50, animation: 'wiggle' },
  { id: 'default-mascot-75', thresholdPercent: 75, animation: 'wiggle' },
  { id: 'default-mascot-100', thresholdPercent: 100, animation: 'wiggle' },
]

export function createDefaultAppSettings(): AppSettings {
  return {
    theme: DEFAULT_THEME,
    defaultAlertCues: DEFAULT_ALERT_CUES.map((cue) => ({ ...cue })),
    defaultAlertVolume: DEFAULT_ALERT_VOLUME,
    defaultShowTimerNotifications: true,
    defaultFlashTaskbar: true,
    defaultMascotAnimationCues: DEFAULT_MASCOT_CUES.map((cue) => ({ ...cue })),
    alwaysOnTop: false,
    compactMode: false,

    defaultContinueFromLastTime: false,
    defaultContinueWhileAppClosed: false,
    defaultAutoAdvanceStages: true,
    mascotSize: 100,
    mascotScale: 1,
    mascotPosition: 'top-right',
    enableInspirationMessages: true,
    autoResetStatsSchedule: 'never',
    defaultGenericMode: 'countdown',
    defaultSitStandMode: 'countdown',
    defaultPomodoroMode: 'countdown',
    serverPort: DEFAULT_SERVER_PORT,
  }
}
