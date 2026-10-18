import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashSocials } from "#src/dash/model/dashSocialsSchema.ts"
import { uiKitDashBausteineGallerySectionsCreate } from "./uiKitDashBausteineGallerySectionsCreate.ts"

export function uiKitDashBausteineGalleryStateCreate() {
  const nameSignal = createSignalObject("Max Öztürk")
  const emailSignal = createSignalObject("max@example.de")
  const socialsSignal = createSignalObject<DashSocials>({
    instagram: "kulturhaus.lindenhof",
    facebook: "kulturhaus.lindenhof",
    tiktok: "kulturhauslindenhof",
    youtube: "kulturhauslindenhof",
    x: "kulturhaus",
    linkedin: "",
  })
  const websiteSignal = createSignalObject("https://kulturhaus-lindenhof.de")
  const logoSizeSignal = createSignalObject<string>("md")

  const sections = () => uiKitDashBausteineGallerySectionsCreate()

  return {
    nameSignal,
    emailSignal,
    socialsSignal,
    websiteSignal,
    logoSizeSignal,
    sections,
  }
}

export type UiKitDashBausteineGalleryState = ReturnType<typeof uiKitDashBausteineGalleryStateCreate>
