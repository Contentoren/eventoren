import { imageList } from "../app/assets/imageList.ts"
import type { EventHeroKnockoutFrame } from "./EventHeroKnockoutFrame.ts"

/**
 * Ordered loop of stage imagery revealed through the "EVENTOREN" glyphs.
 * Each frame uses a different focal point so consecutive frames never pan alike.
 */
export const eventHeroKnockoutFrames: readonly EventHeroKnockoutFrame[] = [
  { image: imageList.i1920x1080_webp_concert_crowd, origin: "50% 60%" },
  { image: imageList.i1920x1080_webp_festival_lights, origin: "50% 45%" },
  { image: imageList.i1920x1080_webp_dj_stage, origin: "55% 50%" },
  { image: imageList.i1920x1080_webp_stage_beams, origin: "45% 55%" },
]
