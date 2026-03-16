/**
 * App-wide constants
 */

// Default timer durations (in seconds)
export const DEFAULT_SIT_DURATION = 25 * 60 // 25 minutes
export const DEFAULT_STAND_DURATION = 5 * 60 // 5 minutes

export const DEFAULT_POMODORO_WORK = 25 * 60 // 25 minutes
export const DEFAULT_POMODORO_SHORT_BREAK = 5 * 60 // 5 minutes
export const DEFAULT_POMODORO_LONG_BREAK = 15 * 60 // 15 minutes
export const DEFAULT_POMODORO_ROUNDS_BEFORE_LONG = 4

// Default generic timer
export const DEFAULT_GENERIC_DURATION = 10 * 60 // 10 minutes

// Inspirational message thresholds (percentage remaining)
export const DEFAULT_INSPIRATION_THRESHOLDS = [75, 50, 25, 10]

// Alert volume
export const DEFAULT_ALERT_VOLUME = 80

// Themes
export const AVAILABLE_THEMES = [
  'CozyLight',
  'CozyDark',
  'Sakura',
  'Forest',
  'Neon',
  'Paper',
] as const

export const DEFAULT_THEME = 'CozyLight'

export const THEME_LABELS: Record<(typeof AVAILABLE_THEMES)[number], string> = {
  CozyLight: 'Cozy Light',
  CozyDark: 'Cozy Dark',
  Sakura: 'Sakura',
  Forest: 'Forest',
  Neon: 'Neon',
  Paper: 'Paper',
}

export const LEGACY_THEME_MAP: Record<string, (typeof AVAILABLE_THEMES)[number]> = {
  'cozy-light': 'CozyLight',
  'cozy-dark': 'CozyDark',
  CozyLight: 'CozyLight',
  CozyDark: 'CozyDark',
  sakura: 'Sakura',
  forest: 'Forest',
  neon: 'Neon',
  paper: 'Paper',
  Sakura: 'Sakura',
  Forest: 'Forest',
  Neon: 'Neon',
  Paper: 'Paper',
}

// Clock display modes
export const CLOCK_DISPLAY_MODES = [
  'digital',
  'analog',
  'ring',
  'flip',
] as const

export const DEFAULT_CLOCK_MODE = 'digital'

// Mascot
export const DEFAULT_MASCOT_SIZE = 100
export const DEFAULT_MASCOT_POSITION = 'top-right'

// Stats
export const AUTO_RESET_SCHEDULES = ['never', 'daily', 'weekly', 'monthly'] as const
export const DEFAULT_AUTO_RESET_SCHEDULE = 'never'

// Streamer mode
export const DEFAULT_STREAMER_WIDTH = 400
export const DEFAULT_STREAMER_HEIGHT = 300
export const DEFAULT_CHROMA_KEY_COLOR = '#00FF00' // Green screen

// Storage
export const STORE_KEY = 'cozy-clock-data'
