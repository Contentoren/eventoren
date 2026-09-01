import type { EventCollageImage } from "./EventCollageImage.ts"
import type { EventItem } from "./EventItem.ts"

const ALL_COLLAGE_IMAGES: readonly EventCollageImage[] = [
  {
    src: "/images/festival-lights_3f89b9a5.webp",
    alt: "Atmosphärisch beleuchtete Festivalbühne bei Nacht mit Lichteffekten",
  },
  {
    src: "/images/stage-beams_0d113a31.webp",
    alt: "Bühnenscheinwerfer mit leuchtenden Lichtstrahlen über dem Publikum",
  },
  {
    src: "/images/concert-crowd_460af152.webp",
    alt: "Feierndes Publikum vor einer hell erleuchteten Konzertbühne",
  },
  {
    src: "/images/dj-stage_ba046940.webp",
    alt: "Elektronische DJ-Bühne mit farbiger Lasershow",
  },
]

export function eventCollageImagesGet(
  event: EventItem,
): readonly [EventCollageImage, EventCollageImage, EventCollageImage] {
  const filtered = ALL_COLLAGE_IMAGES.filter((img) => img.src !== event.imageUrl)
  if (filtered.length >= 3) {
    return [filtered[0]!, filtered[1]!, filtered[2]!]
  }
  return [ALL_COLLAGE_IMAGES[0]!, ALL_COLLAGE_IMAGES[1]!, ALL_COLLAGE_IMAGES[2]!]
}
