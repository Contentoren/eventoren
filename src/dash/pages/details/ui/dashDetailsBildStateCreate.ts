import { createSignalObject } from "#ui/utils/createSignalObject.js"

const galleryKeys = [
  "i1920x1080_webp_concert_crowd",
  "i1920x1080_webp_festival_lights",
  "i1920x1080_webp_stage_beams",
  "i1920x1080_webp_event_production",
  "i1920x1080_webp_dj_stage",
  "pilates_detail",
] as const

/** Bildauswahl der Details-Seite: Picker öffnen/schließen und URL übernehmen. */
export function dashDetailsBildStateCreate(inputs: { canEdit: () => boolean; onPick: (url: string) => void }) {
  const pickerOpen = createSignalObject(false)

  const openPicker = (): void => {
    if (!inputs.canEdit()) return
    pickerOpen.set(true)
  }

  const closePicker = (): void => pickerOpen.set(false)

  const pick = (url: string): void => {
    inputs.onPick(url)
    pickerOpen.set(false)
  }

  return { pickerOpen, openPicker, closePicker, pick, galleryKeys }
}

export type DashDetailsBildState = ReturnType<typeof dashDetailsBildStateCreate>
