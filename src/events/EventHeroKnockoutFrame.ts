import type { ImageType } from "@adaptive-ds/assets-optimizer"

/** One image shown through the hero headline's letterforms. */
export type EventHeroKnockoutFrame = {
  image: ImageType
  /** Focal point of the Ken-Burns pan, as a CSS background-position. */
  origin: string
}
