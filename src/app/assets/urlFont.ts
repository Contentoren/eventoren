import type { FontType } from "@adaptive-ds/assets-optimizer"

export function urlFont(font: FontType): string {
  if (font.path.startsWith("https://")) return font.path
  return `/fonts/${font.path}`
}
