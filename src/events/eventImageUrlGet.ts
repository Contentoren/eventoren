import { eventImagePlaceholder } from "./eventImagePlaceholder.ts"

export function eventImageUrlGet(imageUrl: string): string {
  return imageUrl.trim() || eventImagePlaceholder
}
