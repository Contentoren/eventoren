import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const paletteGroupsInitial = [
  {
    id: "seiten",
    label: "Seiten",
    eventIds: ["events", "bestellungen", "finanzen", "profil"],
  },
  {
    id: "events",
    label: "Events",
    eventIds: ["indie-night", "jazz-wein", "winterball"],
  },
  {
    id: "aktionen",
    label: "Aktionen",
    eventIds: ["event-erstellen", "code-erstellen", "gast-hinzufuegen", "export"],
  },
]

/** Local demo state for the menues gallery: palette visibility and uploaded images. */
export function uiKitMenuesGalleryStateCreate() {
  const paletteOpen = createSignalObject(false)
  const logoDataUrl = createSignalObject<string | null>(null)
  const bannerDataUrl = createSignalObject<string | null>(null)

  const openPalette = () => paletteOpen.set(true)

  const closePalette = (open: boolean) => paletteOpen.set(open)

  const notify = (title: string, description?: string) => {
    toastAdd({ title, description, variant: "success" })
  }

  return {
    paletteOpen,
    logoDataUrl,
    bannerDataUrl,
    paletteGroupsInitial,
    openPalette,
    closePalette,
    notify,
    setLogo: (next: string | null) => logoDataUrl.set(next),
    setBanner: (next: string | null) => bannerDataUrl.set(next),
  }
}

export type UiKitMenuesGalleryState = ReturnType<typeof uiKitMenuesGalleryStateCreate>
