import { imageList } from "../app/assets/imageList.ts"
import { urlImage } from "../app/assets/urlImage.ts"

/** The site-wide 1200x630 Open Graph fallback image with its catalog dimensions. */
export function seoDefaultOgImageRead(alt: string): {
  readonly url: string
  readonly width: number
  readonly height: number
  readonly alt: string
} {
  const image = imageList.i1200x630_webp_eventoren_og
  return { url: urlImage(image), width: image.metadata.width, height: image.metadata.height, alt }
}
