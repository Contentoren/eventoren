export type CommandPaletteFlatItem = {
  id: string
  groupId: string
  groupLabel: string
  label: string
  description?: string
  icon?: string
  keywords: string[]
  hint?: string
  index: number
}

export type CommandPaletteRankedItem = CommandPaletteFlatItem & { score: number }

export type CommandPaletteResultGroup = {
  id: string
  label: string
  items: CommandPaletteRankedItem[]
}

const diacriticsPattern = /[\u0300-\u036f]/g

/** Lowercase, diacritic-insensitive normalization for filtering. */
export function commandPaletteQueryNormalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(diacriticsPattern, "")
}

export function commandPaletteGroupsFlatten(
  groups: {
    id: string
    label: string
    items: { id: string; label: string; description?: string; keywords?: string[] }[]
  }[],
): CommandPaletteFlatItem[] {
  const flat: CommandPaletteFlatItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      flat.push({
        id: `${group.id}:${item.id}`,
        groupId: group.id,
        groupLabel: group.label,
        label: item.label,
        description: item.description,
        keywords: item.keywords ?? [],
        index: flat.length,
      })
    }
  }
  return flat
}

/** Score: 3 = label prefix, 2 = label word/substring, 1 = description/keyword match, -1 = no match. */
export function commandPaletteItemScore(item: CommandPaletteFlatItem, query: string): number {
  const normalizedQuery = commandPaletteQueryNormalize(query.trim())
  if (normalizedQuery === "") return 0
  const normalizedLabel = commandPaletteQueryNormalize(item.label)
  if (normalizedLabel.startsWith(normalizedQuery)) return 3
  for (const word of normalizedLabel.split(/\s+/)) {
    if (word.startsWith(normalizedQuery)) return 2
  }
  if (normalizedLabel.includes(normalizedQuery)) return 2
  if (item.description && commandPaletteQueryNormalize(item.description).includes(normalizedQuery)) return 1
  for (const keyword of item.keywords) {
    if (commandPaletteQueryNormalize(keyword).includes(normalizedQuery)) return 1
  }
  return -1
}

export function commandPaletteFilterGroups(flat: CommandPaletteFlatItem[], query: string): CommandPaletteRankedItem[] {
  const normalized = commandPaletteQueryNormalize(query.trim())
  if (normalized === "") return flat.map((item) => ({ ...item, score: 0 }))
  return flat
    .map((item) => ({ ...item, score: commandPaletteItemScore(item, query) }))
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
}

export function commandPaletteGroupResults(
  ranked: CommandPaletteRankedItem[],
  order: { id: string; label: string }[],
): CommandPaletteResultGroup[] {
  return order
    .map((group) => ({ ...group, items: ranked.filter((item) => item.groupId === group.id) }))
    .filter((group) => group.items.length > 0)
}
