export function sanitizePositiveInt(value: number, fallback = 1): number {
  const numeric = Number.isFinite(value) ? value : fallback
  return Math.max(1, Math.round(numeric))
}

export function minutesToSeconds(minutes: number, fallbackMinutes = 1): number {
  return sanitizePositiveInt(minutes, fallbackMinutes) * 60
}

export function clampPercent(value: number, min = 0, max = 100): number {
  const numeric = Number.isFinite(value) ? value : min
  return Math.max(min, Math.min(max, Math.round(numeric)))
}
