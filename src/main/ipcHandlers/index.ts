/**
 * Register all IPC handlers
 */

import { registerTimerHandlers } from './timerHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerStatsHandlers } from './statsHandlers'
import { registerAppHandlers } from './appHandlers'

export function registerAllHandlers(): void {
  registerTimerHandlers()
  registerSettingsHandlers()
  registerStatsHandlers()
  registerAppHandlers()
}
