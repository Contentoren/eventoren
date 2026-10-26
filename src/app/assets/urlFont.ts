import type { CatalogFont } from "@adaptive-ds/assets-service"

export function urlFont(font: CatalogFont): string {
  if (font.path.startsWith("https://")) return font.path
  return `/fonts/${font.path}`
}
