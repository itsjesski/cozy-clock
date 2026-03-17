/**
 * Shared utility functions used across main and renderer
 */

/**
 * Format seconds into HH:MM:SS string
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Format seconds into a more human-readable format
 * e.g., "1h 30m" or "45m" or "30s"
 */
export function formatTimeHuman(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    if (secs > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (secs > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${minutes}m`
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get a local calendar date as YYYY-MM-DD string
 */
export function getDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDate(): string {
  return getDateKey(new Date())
}

/**
 * Calculate the percentage of time elapsed
 */
export function calculatePercentageElapsed(elapsed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((elapsed / total) * 100)
}

/**
 * Check if a timer's continuity mode should apply on next load
 */
export function shouldResumeContinueMode(
  continueFromLastTime: boolean,
  continueWhileAppClosed: boolean,
  wasRunning: boolean,
): 'none' | 'from-last' | 'while-closed' {
  if (!wasRunning) return 'none'
  if (continueWhileAppClosed) return 'while-closed'
  if (continueFromLastTime) return 'from-last'
  return 'none'
}
