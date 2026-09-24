import type { CatalogImage } from "@adaptive-ds/assets-service"

/** One image shown through the hero headline's letterforms. */
export type EventHeroKnockoutFrame = {
  image: Pick<CatalogImage, "path">
  /** Focal point of the Ken-Burns pan, as a CSS background-position. */
  origin: string
}
