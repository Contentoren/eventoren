import type { VideoType } from "@adaptive-ds/assets-optimizer"
import { assetPublicUrlCreate } from "./assetPublicUrlCreate.js"

const configuredBaseUrl = import.meta.env.VITE_ASSETS_PUBLIC_BASE_URL?.trim() ?? ""
const canonicalAssetsBaseUrl = "https://assets.eventoren.de"

/** Resolve an assets-service catalog video to its canonical managed URL in every build mode. */
export function urlVideo(video: VideoType): string {
  if (video.path.startsWith("https://")) return video.path
  const objectKey = video.path.replace(/^\/+|\/+$/gu, "")
  const publicBaseUrl = configuredBaseUrl.length > 0 ? configuredBaseUrl : canonicalAssetsBaseUrl
  return assetPublicUrlCreate({ publicBaseUrl, r2Prefix: "production" }, objectKey)
}
