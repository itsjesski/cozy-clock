/**
 * Electron main process entry point
 */

import { app, BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import net from 'net'
import isDev from 'electron-is-dev'
import { initializeUpdater } from './updater'
import { initializeTray, isTrayReady, hideMainWindowToTray } from './tray'
import { registerAllHandlers } from './ipcHandlers'
import { startTimerEngine, initializeTimersFromStore } from './timerEngine'
import * as ipc from '../shared/ipc'
import DataStore from './store'
import { logError, logInfo } from './logger'
import { applyLowRamSettings } from './lowRam'

let mainWindow: BrowserWindow | null = null
let isQuitting = false
const store = new DataStore()

if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

applyLowRamSettings()

function resolveWindowIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, '../assets/icon.png'),
    path.join(process.cwd(), 'src/renderer/assets/icon.png'),
    path.join(process.cwd(), 'assets/icon.png'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate))
}

export function getServerPort(): number {
  const settingsPort = Number(store.getSettings().serverPort)
  if (Number.isInteger(settingsPort) && settingsPort >= 1024 && settingsPort <= 65535) {
    return settingsPort
  }

  const envPort = Number(process.env.COZY_CLOCK_PORT)
  if (Number.isInteger(envPort) && envPort >= 1024 && envPort <= 65535) {
    return envPort
  }

  return 5173
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

    // Create minimal HTML for port conflict dialog
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      background: ${isDev ? '#1e1e1e' : '#fff'};
      color: ${isDev ? '#e0e0e0' : '#000'};
    }
    h1 { font-size: 18px; margin-top: 0; }
    p { margin: 12px 0; font-size: 14px; }
    .port-num { font-weight: bold; color: #007acc; }
    .input-group {
      margin: 20px 0;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    input {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      width: 100px;
      background: ${isDev ? '#2d2d2d' : '#fff'};
      color: ${isDev ? '#e0e0e0' : '#000'};
    }
    .buttons {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      justify-content: flex-end;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      background: #007acc;
      color: white;
    }
    button:hover { background: #005a9e; }
    button.secondary {
      background: #666;
    }
    button.secondary:hover { background: #555; }
  </style>
</head>
<body>
  <h1>⚠️ Port Already in Use</h1>
  <p>The server port <span class="port-num" id="portNum">${conflictPort}</span> is already in use by another application.</p>
  <p>Enter a different port number to continue:</p>
  <div class="input-group">
    <input type="number" id="newPort" min="1024" max="65535" value="5174" />
  </div>
  <div class="buttons">
    <button class="secondary" id="cancelBtn">Cancel</button>
    <button id="restartBtn">Update & Restart</button>
  </div>
  <script>
    const input = document.getElementById('newPort');
    const restartBtn = document.getElementById('restartBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    input.focus();
    input.select();
    
    restartBtn.onclick = () => {
      const port = Number(input.value);
      if (Number.isInteger(port) && port >= 1024 && port <= 65535) {
        window.electronAPI?.updateServerPort(port);
      }
    };
    
    cancelBtn.onclick = () => {
      window.electronAPI?.cancelPortChange();
    };
  </script>
</body>
</html>
    `

    portModalWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

    // IPC handlers for port modal
    const handleUpdatePort = (_: Electron.IpcMainEvent, port: number) => {
      if (Number.isInteger(port) && port >= 1024 && port <= 65535) {
        store.updateSettings({ serverPort: port })
        portModalWindow.close()
        app.relaunch()
        app.exit(0)
      }
      resolve()
    }

    const handleCancelPort = () => {
      portModalWindow.close()
      resolve()
    }

    ipcMain.once('update-server-port', handleUpdatePort)
    ipcMain.once('cancel-port-change', handleCancelPort)

    portModalWindow.on('closed', () => {
      ipcMain.removeListener('update-server-port', handleUpdatePort)
      ipcMain.removeListener('cancel-port-change', handleCancelPort)
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
    : `file://${path.join(__dirname, '../renderer/index.html')}`

  mainWindow.loadURL(startUrl)

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

  const nativeMinimizeEmitter = mainWindow as unknown as {
    on: (event: string, listener: (event: Electron.Event) => void) => void
  }

  nativeMinimizeEmitter.on('minimize', (event: Electron.Event) => {
    if (!isQuitting && store.getSettings().minimizeToTray && (isTrayReady() || initializeTray())) {
      event.preventDefault()
      hideMainWindowToTray()
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting && store.getSettings().minimizeToTray && (isTrayReady() || initializeTray())) {
      event.preventDefault()
      hideMainWindowToTray()
    }
  })

  mainWindow.on('closed', () => {
    screen.removeListener('display-metrics-changed', ensureWindowOnScreen)
    mainWindow = null
  })

  return mainWindow
}

app.on('ready', async () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
    logError('Uncaught exception', error)
  })

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error)
    logError('Unhandled rejection', error)
  })

  logInfo('Application starting')
  createWindow()

  // Check if configured port is in use (for dev/production server)
  if (isDev) {
    const serverPort = getServerPort()
    if (await isPortInUse(serverPort)) {
      logInfo(`Port ${serverPort} is in use, showing port conflict dialog`)
      await showPortConflictDialog(serverPort)
      // After dialog, we should return here to wait for user action
      return
    }
  }

  if (!isDev) {
    initializeUpdater({
      onUpdateAvailable: () => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(ipc.IPC_APP_UPDATE_AVAILABLE, { available: true })
        })
      },
      onDownloadProgress: (percent) => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(ipc.IPC_APP_UPDATE_PROGRESS, { percent })
        })
      },
      onUpdateReady: () => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(ipc.IPC_APP_UPDATE_READY, { ready: true })
        })
      },
      onUpdateError: (message) => {
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send(ipc.IPC_APP_UPDATE_ERROR, { message })
        })
      },
    })
  }
  initializeTray()

  // Initialize IPC handlers
  registerAllHandlers()

  // Initialize and start timer engine
  initializeTimersFromStore()
  startTimerEngine()
})

app.on('before-quit', () => {
  isQuitting = true
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
    mainWindow.setSkipTaskbar(false)
    mainWindow.show()
    mainWindow.focus()
  }
})

// IPC handlers will be loaded here in subsequent phases
