/** Verschiebt das Element mit fromId vor das Element mit toId. Pure: neues Array, Eingabe unverändert. */
export function dashListItemMove<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return [...items]
  const from = items.findIndex((item) => item.id === fromId)
  if (from < 0) return [...items]
  if (items.findIndex((item) => item.id === toId) < 0) return [...items]
  const result = [...items]
  const [moved] = result.splice(from, 1)
  if (moved === undefined) return [...items]
  const target = result.findIndex((item) => item.id === toId)
  result.splice(target < 0 ? result.length : target, 0, moved)
  return result
}
