import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function adminShellMobileProfileStateCreate(area: "admin" | "organizer", pathname: () => string) {
  const openedPath = createSignalObject<string | null>(null)
  const isOrganizerEventDetail = () => area === "organizer" && /^\/organizer\/event\/[^/]+\/?$/.test(pathname())
  const profileVisible = () => openedPath.get() === pathname() && !isOrganizerEventDetail()

  createEffect(on(pathname, () => openedPath.set(null), { defer: true }))

  return {
    isOrganizerEventDetail,
    profileVisible,
    profileToggle: () => {
      if (isOrganizerEventDetail()) return
      openedPath.set(profileVisible() ? null : pathname())
    },
    profileClose: () => openedPath.set(null),
  }
}
