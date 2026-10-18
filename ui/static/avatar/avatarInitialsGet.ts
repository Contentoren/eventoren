/** Initials of the first two words of a display name, uppercased. */
export function avatarInitialsGet(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const picked = words.slice(0, 2).map((word) => word.charAt(0))
  if (picked.length === 0) return "?"
  return picked.join("").toUpperCase()
}
