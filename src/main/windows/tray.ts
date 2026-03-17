/**
 * System tray management
 */

import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import DataStore from './store'

let tray: Tray | null = null
const store = new DataStore()

function resolveTrayIconPath(): string | undefined {
  const candidates = [
    // Mascot pixel art (preferred for branding)
    path.join(__dirname, '../assets/mascot.png'),
    path.join(process.cwd(), 'src/renderer/assets/mascot.png'),
    path.join(process.cwd(), 'assets/mascot.png'),
    // Fallback to SVG if available
    path.join(__dirname, '../assets/mascot-placeholder.svg'),
    path.join(process.cwd(), 'src/renderer/assets/mascot-placeholder.svg'),
    // Standard tray/app icons
    path.join(__dirname, '../assets/icon-tray.png'),
    path.join(__dirname, '../assets/icon.png'),
    path.join(process.cwd(), 'src/renderer/assets/icon-tray.png'),
    path.join(process.cwd(), 'src/renderer/assets/icon.png'),
    path.join(process.cwd(), 'assets/icon-tray.png'),
    path.join(process.cwd(), 'assets/icon.png'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate))
}

function createTrayIcon() {
  const iconPath = resolveTrayIconPath()
  if (iconPath) {
    const fileIcon = nativeImage.createFromPath(iconPath)
    if (!fileIcon.isEmpty()) {
      return fileIcon
    }
  }

  const executableIcon = nativeImage.createFromPath(process.execPath)
  if (!executableIcon.isEmpty()) {
    return executableIcon
  }

  return nativeImage.createEmpty()
}

export function isTrayReady(): boolean {
  return tray !== null
}

export function showMainWindowFromTray(): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length === 0) return

  windows[0].setSkipTaskbar(false)
  windows[0].show()
  windows[0].focus()
}

export function hideMainWindowToTray(): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length === 0) return

  windows[0].setSkipTaskbar(true)
  windows[0].hide()
}

export function initializeTray(): boolean {
  if (tray) {
    return true
  }

  const trayIcon = createTrayIcon()
  if (trayIcon.isEmpty()) {
    return false
  }

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        showMainWindowFromTray()
      },
    },
    {
      label: 'Hide to Tray',
      click: () => {
        if (store.getSettings().minimizeToTray !== false && isTrayReady()) {
          hideMainWindowToTray()
        }
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip('Cozy Clock - Timer Dashboard')

  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      if (windows[0].isVisible()) {
        hideMainWindowToTray()
      } else {
        showMainWindowFromTray()
      }
    }
  })

  return true
}
