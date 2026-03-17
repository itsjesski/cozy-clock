import type { AppSettings } from '../../types'

export function shouldMinimizeToTray(settings: AppSettings): boolean {
  return settings.minimizeToTray !== false
}
