export const DEFAULT_SERVER_PORT = 5173
export const MIN_SERVER_PORT = 1024
export const MAX_SERVER_PORT = 65535

export function isValidServerPort(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_SERVER_PORT &&
    value <= MAX_SERVER_PORT
  )
}

export function parseServerPort(value: unknown, fallback = DEFAULT_SERVER_PORT): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return isValidServerPort(parsed) ? parsed : fallback
}
