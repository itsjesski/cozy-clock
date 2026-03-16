const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const http = require('http')

function resolveConfiguredDevPort() {
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

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true, stdio: 'inherit' })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

function waitForVite(port, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const startedAt = Date.now()

    const attempt = () => {
      const request = http.get(`http://localhost:${port}`, (response) => {
        response.resume()
        resolve(true)
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
  const port = resolveConfiguredDevPort()
  const buildCode = await runCommand('npm', ['run', 'build:main'])
  if (buildCode !== 0) {
    process.exit(buildCode)
    return
  }

  const ready = await waitForVite(port)
  if (!ready) {
    console.error(`Timed out waiting for Vite on port ${port}`)
    process.exit(1)
    return
  }

  const electronCode = await runCommand('electron', ['.'])
  process.exit(electronCode)
})()
