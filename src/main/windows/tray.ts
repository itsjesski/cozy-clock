/**
 * System tray management
 */

import { app, Tray, Menu, nativeImage } from 'electron'
import DataStore from '../store'
import { resolveTrayIconPath } from './assetPaths'
import { hidePrimaryWindowToTray, showPrimaryWindow, getPrimaryWindow } from './windowUtils'
import { shouldMinimizeToTray } from './trayPolicy'

let tray: Tray | null = null
const store = new DataStore()

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
  showPrimaryWindow()
}

export function hideMainWindowToTray(): void {
  hidePrimaryWindowToTray()
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
        if (shouldMinimizeToTray(store.getSettings()) && isTrayReady()) {
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
    const window = getPrimaryWindow()
    if (window) {
      if (window.isVisible()) {
        hideMainWindowToTray()
      } else {
        showMainWindowFromTray()
      }
    }
  })

  return true
}
