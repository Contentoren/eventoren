import { useContext } from "solid-js"
import { adminSidebarContext } from "../admin/adminSidebarContext.ts"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"

export function organizerEventDetailMobileNavStateCreate(state: () => OrganizerEventDetailPageState) {
  const sidebarOpen = useContext(adminSidebarContext)

  const scannerShow = () => {
    if (!state().scannerOpen()) state().scannerToggle()
    queueMicrotask(() => document.getElementById("organizer-scanner-card")?.scrollIntoView({ behavior: "smooth" }))
  }

  const ticketsShow = () => {
    if (state().scannerOpen()) state().scannerToggle()
    if (state().search()) state().searchChange("")
    document.getElementById("organizer-ticket-list")?.scrollIntoView({ behavior: "smooth" })
  }

  return { sidebarOpen, scannerShow, ticketsShow }
}
