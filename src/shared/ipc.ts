/**
 * IPC channel names - single source of truth
 * Used for all communication between main and renderer processes
 */

// Timer operations
export const IPC_TIMER_CREATE = 'timer:create'
export const IPC_TIMER_LIST = 'timer:list'
export const IPC_TIMER_UPDATE = 'timer:update'
export const IPC_TIMER_DELETE = 'timer:delete'
export const IPC_TIMER_START = 'timer:start'
export const IPC_TIMER_PAUSE = 'timer:pause'
export const IPC_TIMER_RESUME = 'timer:resume'
export const IPC_TIMER_RESET = 'timer:reset'
export const IPC_TIMER_GET_STATE = 'timer:get-state'
export const IPC_TIMER_TICK = 'timer:tick'
export const IPC_TIMER_ALERT = 'timer:alert'
export const IPC_TIMER_STATE_UPDATE = 'timer:state-update'
export const IPC_MASCOT_ANIMATE = 'mascot:animate'

// Settings operations
export const IPC_SETTINGS_GET = 'settings:get'
export const IPC_SETTINGS_UPDATE = 'settings:update'

// Stats operations
export const IPC_STATS_GET = 'stats:get'
export const IPC_STATS_RESET = 'stats:reset'
export const IPC_STATS_UPDATE = 'stats:update'
export const IPC_TIMER_STATS_GET = 'timer:stats:get'
export const IPC_STATS_EXPORT_CSV = 'stats:export-csv'

// Streamer mode
export const IPC_STREAMER_WINDOW = 'streamer:window'
export const IPC_STREAMER_HOTKEY = 'streamer:hotkey'

// App lifecycle
export const IPC_APP_QUIT = 'app:quit'
export const IPC_APP_OPEN_UPDATES = 'app:open-updates'
export const IPC_APP_UPDATE_AVAILABLE = 'app:update-available'
export const IPC_APP_UPDATE_DOWNLOAD = 'app:update-download'
export const IPC_APP_UPDATE_PROGRESS = 'app:update-progress'
export const IPC_APP_UPDATE_READY = 'app:update-ready'
export const IPC_APP_UPDATE_INSTALL = 'app:update-install'
export const IPC_APP_UPDATE_ERROR = 'app:update-error'
export const IPC_APP_OPEN_LOGS = 'app:open-logs'
export const IPC_APP_PICK_SOUND_FILE = 'app:pick-sound-file'
export const IPC_APP_RESOLVE_SOUND_SOURCE = 'app:resolve-sound-source'
export const IPC_WINDOW_CLOSE = 'window:close'
export const IPC_WINDOW_MINIMIZE = 'window:minimize'
export const IPC_WINDOW_MAXIMIZE = 'window:maximize'

// Port modal actions
export const IPC_PORT_UPDATE = 'port:update'
export const IPC_PORT_CANCEL = 'port:cancel'
