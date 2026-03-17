import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function resolveConfiguredServerPort(): number {
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
      // ignore malformed config candidates and continue fallback chain
    }
  }

  return 5173
}

const devPort = resolveConfiguredServerPort()
const devServerToken = process.env.COZY_CLOCK_DEV_SERVER_TOKEN?.trim()
const devServerHeaders = devServerToken
  ? {
      'X-Cozy-Clock-Dev-Server': 'cozy-clock',
      'X-Cozy-Clock-Dev-Server-Token': devServerToken,
    }
  : undefined

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@types': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
    hmr: true,
    headers: devServerHeaders,
  },
  build: {
    target: 'ES2020',
    minify: 'terser',
    sourcemap: false,
    outDir: 'dist/renderer',
  },
})
