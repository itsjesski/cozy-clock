import { BrowserWindow } from 'electron'

export function getPrimaryWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function showPrimaryWindow(): void {
  const window = getPrimaryWindow()
  if (!window) return

  window.setSkipTaskbar(false)
  window.show()
  window.focus()
}

export function hidePrimaryWindowToTray(): void {
  const window = getPrimaryWindow()
  if (!window) return

  window.hide()
  window.setSkipTaskbar(true)
}
