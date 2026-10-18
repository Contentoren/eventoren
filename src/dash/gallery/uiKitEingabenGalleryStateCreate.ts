import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { uiKitEingabenGallerySectionsCreate } from "./uiKitEingabenGallerySectionsCreate.ts"

export function uiKitEingabenGalleryStateCreate() {
  const activeFilters = createSignalObject<string[]>(["alle"])
  const abendkasseAktiv = createSignalObject(true)
  const erinnerungAktiv = createSignalObject(false)
  const zeitraumSignal = createSignalObject("30")
  const ansichtSignal = createSignalObject("liste")
  const tabSignal = createSignalObject("aktuell")
  const stepperSignal = createSignalObject(1)
  const stepperOrientationSignal = createSignalObject<"horizontal" | "vertical">("horizontal")

  const sections = () => uiKitEingabenGallerySectionsCreate()

  return {
    activeFilters,
    abendkasseAktiv,
    erinnerungAktiv,
    zeitraumSignal,
    ansichtSignal,
    tabSignal,
    stepperSignal,
    stepperOrientationSignal,
    sections,
  }
}

export type UiKitEingabenGalleryState = ReturnType<typeof uiKitEingabenGalleryStateCreate>
