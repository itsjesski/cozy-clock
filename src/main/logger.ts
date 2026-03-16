import { app } from 'electron'
import fs from 'fs'
import path from 'path'

function ensureLogDirectory(): string {
  const logDir = path.join(app.getPath('userData'), 'logs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

export function getLogDirectory(): string {
  return ensureLogDirectory()
}

export function getLogFilePath(): string {
  return path.join(ensureLogDirectory(), 'cozy-clock.log')
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`.trim()
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function appendLog(level: 'INFO' | 'ERROR', message: string): void {
  try {
    fs.appendFileSync(getLogFilePath(), `[${new Date().toISOString()}] [${level}] ${message}\n`)
  } catch {
    // Avoid crashing while attempting to log.
  }
}

export function logInfo(message: string): void {
  appendLog('INFO', message)
}

export function logError(context: string, error: unknown): void {
  appendLog('ERROR', `${context}: ${serializeError(error)}`)
}