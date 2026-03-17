const { spawn, execFile } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const http = require('http')
const net = require('net')

let viteProcess = null
const devServerToken = crypto.randomBytes(24).toString('hex')

function killViteProcess() {
  return new Promise((resolve) => {
    if (!viteProcess) {
      resolve()
      return
    }

    const child = viteProcess
    viteProcess = null

    child.once('exit', () => {
      resolve()
    })

    if (process.platform === 'win32') {
      execFile('taskkill', ['/pid', String(child.pid), '/t', '/f'], () => {
        resolve()
      })
      return
    }

    if (!child.kill('SIGTERM')) {
      resolve()
      return
    }

    setTimeout(() => {
      try {
        process.kill(child.pid, 'SIGKILL')
      } catch {
        // Process already dead
      }
      resolve()
    }, 5000)
  })
}

function resolveConfiguredServerPort() {
  const envPort = Number(process.env.COZY_CLOCK_PORT)
  if (Number.isInteger(envPort) && envPort >= 1024 && envPort <= 65535) {
    return envPort
  }

  const appDataPath = process.env.APPDATA
  if (!appDataPath) {
    return 5173
  }

  const settingsCandidates = [
    path.join(appDataPath, 'cozy-clock', 'cozy-clock-config.json'),
    path.join(appDataPath, 'cozy-clock', 'config.json'),
    path.join(appDataPath, 'cozy-clock-config.json'),
  ]

  for (const settingsPath of settingsCandidates) {
    try {
      if (!fs.existsSync(settingsPath)) continue
      const raw = fs.readFileSync(settingsPath, 'utf8')
      const parsed = JSON.parse(raw)
      const configuredPort = Number(parsed?.settings?.serverPort)
      if (Number.isInteger(configuredPort) && configuredPort >= 1024 && configuredPort <= 65535) {
        return configuredPort
      }
    } catch {
      // ignore malformed config candidates
    }
  }

  return 5173
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true, stdio: 'inherit', ...options })
    
    // Track vite process specifically
    if (command === 'npm' && args[0] === 'run' && args[1] === 'dev:vite') {
      viteProcess = child
    }
    
    child.on('close', (code) => resolve(code ?? 1))
  })
}

let isCleaningUp = false

async function cleanupAndExit(code = 0) {
  if (isCleaningUp) {
    return
  }

  isCleaningUp = true
  await killViteProcess()
  process.exit(code)
}

function waitForVite(port, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const startedAt = Date.now()

    const attempt = () => {
      const request = http.get(`http://127.0.0.1:${port}/@vite/client`, (response) => {
        const markerHeader = response.headers['x-cozy-clock-dev-server']
        const tokenHeader = response.headers['x-cozy-clock-dev-server-token']
        const marker = Array.isArray(markerHeader) ? markerHeader[0] : markerHeader
        const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader
        const isExpectedServer = response.statusCode === 200 && marker === 'cozy-clock' && token === devServerToken
        response.resume()

        if (isExpectedServer) {
          resolve(true)
          return
        }

        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false)
          return
        }

        setTimeout(attempt, 500)
      })

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false)
          return
        }

        setTimeout(attempt, 500)
      })

      request.setTimeout(1000, () => {
        request.destroy()
      })
    }

    attempt()
  })
}

;(async () => {
  const port = resolveConfiguredServerPort()
  const childEnv = {
    ...process.env,
    COZY_CLOCK_DEV_SERVER_TOKEN: devServerToken,
  }

  const buildCode = await runCommand('npm', ['run', 'build:main'])
  if (buildCode !== 0) {
    await killViteProcess()
    process.exit(buildCode)
    return
  }


  // Start Vite dev server in background
  viteProcess = spawn('npm', ['run', 'dev:vite'], { shell: true, stdio: 'inherit', env: childEnv })
  viteProcess.on('error', (err) => {
    console.error('Failed to start Vite:', err)
    process.exit(1)
  })
  viteProcess.once('exit', (code) => {
    if (!isCleaningUp && code && code !== 0) {
      console.error(`Vite dev server exited early with code ${code}`)
      process.exit(code)
    }
  })
  const ready = await waitForVite(port)
  if (!ready) {
    console.error(`Timed out waiting for Vite on port ${port}`)
    await cleanupAndExit(1)
    return
  }

  const electronCode = await runCommand('electron', ['.'], { env: childEnv })
  await cleanupAndExit(electronCode)
})()

process.on('SIGINT', async () => {
  await cleanupAndExit(0)
})

process.on('SIGTERM', async () => {
  await cleanupAndExit(0)
})

process.on('exit', () => {
  if (viteProcess && process.platform === 'win32') {
    execFile('taskkill', ['/pid', String(viteProcess.pid), '/t', '/f'], () => {})
  }
})
