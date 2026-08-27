import type { VideoType } from "@adaptive-ds/assets-optimizer"
import { packageName } from "./package"

export function urlVideo(video: VideoType): string {
  if (video.path.startsWith("https://")) return video.path
  if (import.meta.env.PROD) return `https://assets.${packageName}.de/videos/optimized/${video.path}`
  return `/videos/${video.path}`
}
