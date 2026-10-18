import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { uiKitBasisGallerySectionsCreate } from "./uiKitBasisGallerySectionsCreate.ts"

export function uiKitBasisGalleryStateCreate() {
  const darkPreview = createSignalObject(false)

  const sections = () => uiKitBasisGallerySectionsCreate()

  return {
    darkPreview,
    sections,
  }
}

export type UiKitBasisGalleryState = ReturnType<typeof uiKitBasisGalleryStateCreate>
