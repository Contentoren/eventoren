import type { Doc } from "#convex/_generated/dataModel.js"
import { imageList } from "#src/app/assets/service/imageList.ts"

type EventImage = Pick<Doc<"catalogEvents">, "imageUrl" | "imageVariants" | "imageAlt">

/** Repair only the known blank record; any configured image wins over this historical default. */
export function catalogPilatesImageBackfillCreate(
  event: EventImage & Pick<Doc<"catalogEvents">, "eventKey" | "deletedAt">,
): EventImage | undefined {
  if (event.eventKey !== "pilates-christmas-event-2027-final" || event.deletedAt) return
  if (
    event.imageUrl.trim() ||
    event.imageVariants?.detail.trim() ||
    event.imageVariants?.card.trim() ||
    event.imageVariants?.organizer.trim()
  )
    return

  // Existing published assets, not environment-dependent frontend/local paths.
  const publicBaseUrl = "https://assets-service-public.contentoren.de/eventoren/public/"
  const detail = new URL(imageList.pilates_detail.path, publicBaseUrl).toString()
  const card = new URL(imageList.pilates_card.path, publicBaseUrl).toString()
  return {
    imageUrl: detail,
    imageVariants: {
      // The original detail and card artworks are separately managed assets.
      assetId: "asset-upload-edf48a71-81be-4699-9ed1-1db32db0a3da",
      detail,
      card,
      organizer: card,
    },
    imageAlt: event.imageAlt.trim() ? event.imageAlt : imageList.pilates_detail.metadata.alt,
  }
}
