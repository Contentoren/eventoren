import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { uiKitDashGallerySectionsCreate } from "#src/dash/gallery/uiKitDashGallerySectionsCreate.ts"

export function uiKitDashGalleryStateCreate() {
  const descriptionSignal = createSignalObject(
    "## Jazz & Wein\n\nEin Abend mit **Live-Musik** und *Naturweinen* im Hof.\n\n- Einlass ab 19:00\n- Beginn 20:00\n\n[Programm ansehen](https://example.de/programm)",
  )
  const moneyCentsSignal = createSignalObject<number | null>(2550)
  const eventStartSignal = createSignalObject<string | null>("2026-11-07T19:00:00.000Z")
  const darkPreviewSignal = createSignalObject(false)

  const sections = () => uiKitDashGallerySectionsCreate()

  return {
    descriptionSignal,
    moneyCentsSignal,
    eventStartSignal,
    darkPreviewSignal,
    sections,
  }
}

export type UiKitDashGalleryState = ReturnType<typeof uiKitDashGalleryStateCreate>
