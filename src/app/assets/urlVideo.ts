import type { VideoType } from "@adaptive-ds/assets-optimizer"

const publicBaseUrl =
  import.meta.env.VITE_ASSETS_PUBLIC_BASE_URL?.trim() ||
  (import.meta.env.PROD
    ? "https://assets.eventoren.de/production/public"
    : "https://assets.eventoren.de/development/public")

export function urlVideo(video: VideoType): string {
  if (video.path.startsWith("https://")) return video.path
  const objectKey = video.path.replace(/^\/+|\/+$/gu, "")
  if (!import.meta.env.PROD) return `/videos/${objectKey}`
  return new URL(objectKey, publicBaseUrl.replace(/\/+$/u, "") + "/").toString()
}
