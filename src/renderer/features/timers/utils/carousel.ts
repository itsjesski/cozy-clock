export function getPreviousCircularIndex(currentIndex: number, count: number): number {
  if (count <= 0) return 0
  return currentIndex === 0 ? count - 1 : currentIndex - 1
}

export function getNextCircularIndex(currentIndex: number, count: number): number {
  if (count <= 0) return 0
  return currentIndex === count - 1 ? 0 : currentIndex + 1
}
