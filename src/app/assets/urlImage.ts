import type { ImageType } from "@adaptive-ds/assets-optimizer"
import { packageName } from "./package"

export function urlImage(image: ImageType, fromVideo = false): string {
  if (image.path.startsWith("https://")) return image.path
  const r2CustomDomain = `assets.${packageName}.de`
  if (import.meta.env.PROD)
    return `https://${r2CustomDomain}/${fromVideo ? "videos" : "images"}/optimized/${image.path}`
  return `/${fromVideo ? "videos" : "images"}/${image.path}`
}
