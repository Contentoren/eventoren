import { eventImagePlaceholder } from "./eventImagePlaceholder.ts"

export function eventImageErrorHandle(event: { currentTarget: Pick<HTMLImageElement, "getAttribute" | "src"> }): void {
  const image = event.currentTarget
  if (image.getAttribute("src") === eventImagePlaceholder) return
  image.src = eventImagePlaceholder
}
