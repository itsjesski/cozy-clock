/**
 * Electron main process entry point
 */

import { app, BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'
import net from 'net'
import http from 'http'
import isDev from 'electron-is-dev'
import { initializeUpdater } from './services/updater'
import { registerAllHandlers } from './ipcHandlers'
import { startTimerEngine, initializeTimersFromStore } from './services/timerEngine'
import * as ipc from '../shared/ipc'
import DataStore from './store'
import { logInfo } from './services/logger'
import { applyLowRamSettings } from './services/lowRam'
import {
  DEFAULT_SERVER_PORT,
  isValidServerPort,
} from '../shared/serverPort'
import { resolveWindowIconPath } from './windows/assetPaths'
import { buildPortConflictDialogHtml } from './windows/portDialogHtml'
import { registerGlobalProcessErrorHandlers } from './services/errorHandlers'
import { broadcastToAllWindows } from './windows/windowBroadcast'

let mainWindow: BrowserWindow | null = null
const store = new DataStore()

if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

applyLowRamSettings()

export function getServerPort(): number {
  const settingsPort = Number(store.getSettings().serverPort)
  if (isValidServerPort(settingsPort)) {
    return settingsPort
  }

  const envPort = Number(process.env.COZY_CLOCK_PORT)
  if (isValidServerPort(envPort)) {
    return envPort
  }

  return DEFAULT_SERVER_PORT
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true)
      } else {
        resolve(false)
      }
    })
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port, '127.0.0.1')
  })
}

function isViteDevServerAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const expectedToken = process.env.COZY_CLOCK_DEV_SERVER_TOKEN?.trim()
    if (!expectedToken) {
      resolve(false)
      return
    }

    const request = http.get(`http://127.0.0.1:${port}/@vite/client`, (response) => {
      const markerHeader = response.headers['x-cozy-clock-dev-server']
      const tokenHeader = response.headers['x-cozy-clock-dev-server-token']
      const marker = Array.isArray(markerHeader) ? markerHeader[0] : markerHeader
      const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader
      const isOk = response.statusCode === 200 && marker === 'cozy-clock' && token === expectedToken
      response.resume()
      resolve(isOk)
    })

    request.on('error', () => {
      resolve(false)
    })

    request.setTimeout(1000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

async function showPortConflictDialog(conflictPort: number): Promise<void> {
  return new Promise((resolve) => {
    const portModalWindow = new BrowserWindow({
      width: 500,
      height: 350,
      resizable: false,
      modal: true,
      parent: mainWindow ?? undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    })

    const htmlContent = buildPortConflictDialogHtml(conflictPort, isDev)

    portModalWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

    // IPC handlers for port modal
    const handleUpdatePort = (_: Electron.IpcMainEvent, port: number) => {
      if (isValidServerPort(port)) {
        store.updateSettings({ serverPort: port })
        portModalWindow.close()
        app.relaunch()
        app.exit(0)
      }
      resolve()
    }

    const handleCancelPort = () => {
      portModalWindow.close()
      app.quit()
      resolve()
    }

    ipcMain.once(ipc.IPC_PORT_UPDATE, handleUpdatePort)
    ipcMain.once(ipc.IPC_PORT_CANCEL, handleCancelPort)

    portModalWindow.on('closed', () => {
      ipcMain.removeListener(ipc.IPC_PORT_UPDATE, handleUpdatePort)
      ipcMain.removeListener(ipc.IPC_PORT_CANCEL, handleCancelPort)
      resolve()
    })
  })
}
function createWindow() {
  const iconPath = resolveWindowIconPath()
  const settings = store.getSettings()
  const compactWindowBounds = settings.compactMode
    ? { width: 480, height: 640, minWidth: 360, minHeight: 520 }
    : { width: 1200, height: 800, minWidth: 800, minHeight: 600 }

  console.error('[DEBUG] Creating window...')

  mainWindow = new BrowserWindow({
    width: compactWindowBounds.width,
    height: compactWindowBounds.height,
    minWidth: compactWindowBounds.minWidth,
    minHeight: compactWindowBounds.minHeight,
    autoHideMenuBar: true,
    show: false,
    alwaysOnTop: !!settings.alwaysOnTop,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: true,
      spellcheck: false,
      preload: path.join(__dirname, '../preload.js'),
    },
  })

  const startUrl = isDev
    ? `http://localhost:${getServerPort()}`
    : `file://${path.join(app.getAppPath(), 'dist/renderer/index.html')}`

  logInfo(`Loading URL (isDev=${isDev}): ${startUrl}`)

  // Add error handlers for debugging blank/white screen issues
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logInfo(`Failed to load ${validatedURL}: ${errorCode} - ${errorDescription}`)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    logInfo('Renderer successfully loaded')
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logInfo(`Renderer process gone: ${details?.reason}`)
  })

  mainWindow.loadURL(startUrl).catch((err) => {
    logInfo(`Error loading URL: ${err.message}`)
  })

  const ensureWindowOnScreen = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    const bounds = mainWindow.getBounds()
    const display = screen.getDisplayMatching(bounds)
    const workArea = display.workArea
    const fitsHorizontally = bounds.x >= workArea.x && bounds.x + 80 <= workArea.x + workArea.width
    const fitsVertically = bounds.y >= workArea.y && bounds.y + 80 <= workArea.y + workArea.height

    if (fitsHorizontally && fitsVertically) {
      return
    }

    const nextWidth = Math.min(bounds.width, workArea.width)
    const nextHeight = Math.min(bounds.height, workArea.height)
    const centeredX = workArea.x + Math.round((workArea.width - nextWidth) / 2)
    const centeredY = workArea.y + Math.round((workArea.height - nextHeight) / 2)

    mainWindow.setBounds({
      x: centeredX,
      y: centeredY,
      width: nextWidth,
      height: nextHeight,
    })
  }

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.once('ready-to-show', () => {
    ensureWindowOnScreen()
    mainWindow?.show()
  })

  mainWindow.on('move', ensureWindowOnScreen)
  mainWindow.on('resize', ensureWindowOnScreen)
  screen.on('display-metrics-changed', ensureWindowOnScreen)

  mainWindow.on('closed', () => {
    screen.removeListener('display-metrics-changed', ensureWindowOnScreen)
    mainWindow = null
  })

  return mainWindow
}

app.on('ready', async () => {
  registerGlobalProcessErrorHandlers()

  logInfo('Application starting')
  console.error('[DEBUG] App ready event fired')

  // Check the configured dev server port before opening the main window.
  if (isDev) {
    const serverPort = getServerPort()
    console.error(`[DEBUG] isDev=true, port=${serverPort}`)
    if ((await isPortInUse(serverPort)) && !(await isViteDevServerAvailable(serverPort))) {
      logInfo(`Port ${serverPort} is in use, showing port conflict dialog`)
      await showPortConflictDialog(serverPort)
      return
    }
  } else {
    console.error('[DEBUG] isDev=false, using packaged renderer path')
  }

  createWindow()

  if (!isDev) {
    initializeUpdater({
      onUpdateAvailable: () => {
        broadcastToAllWindows(ipc.IPC_APP_UPDATE_AVAILABLE, { available: true })
      },
      onDownloadProgress: (percent) => {
        broadcastToAllWindows(ipc.IPC_APP_UPDATE_PROGRESS, { percent })
      },
      onUpdateReady: () => {
        broadcastToAllWindows(ipc.IPC_APP_UPDATE_READY, { ready: true })
      },
      onUpdateError: (message) => {
        broadcastToAllWindows(ipc.IPC_APP_UPDATE_ERROR, { message })
      },
    })
  }

  // Initialize IPC handlers
  registerAllHandlers()

  // Initialize and start timer engine
  initializeTimersFromStore()
  startTimerEngine()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
})

// IPC handlers will be loaded here in subsequent phases
