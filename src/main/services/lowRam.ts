import { app } from 'electron'

const DEFAULT_MAX_OLD_SPACE_MB = 192

function getMaxOldSpaceFromEnv(): number {
  const raw = Number(process.env.COZY_CLOCK_MAX_OLD_SPACE_MB)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.round(raw)
  }

  return DEFAULT_MAX_OLD_SPACE_MB
}

export function applyLowRamSettings(): void {
  app.commandLine.appendSwitch(
    'js-flags',
    `--max-old-space-size=${getMaxOldSpaceFromEnv()}`,
  )

  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

  if (process.env.COZY_CLOCK_DISABLE_HARDWARE_ACCELERATION === '1') {
    app.disableHardwareAcceleration()
  }
}
