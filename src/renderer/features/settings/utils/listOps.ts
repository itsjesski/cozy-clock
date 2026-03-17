export function updateById<T extends { id: string }>(
  list: T[],
  id: string,
  updates: Partial<T>,
): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...updates } : item))
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id)
}

export function appendItem<T>(list: T[], item: T): T[] {
  return [...list, item]
}
