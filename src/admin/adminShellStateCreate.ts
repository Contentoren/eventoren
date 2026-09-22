import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiBarcodeScan } from "@adaptive-ds/mdi/mdiBarcodeScan.js"
import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { useLocation } from "@tanstack/solid-router"
import { createEffect, on } from "solid-js"
import { eventorenAuthContextUse } from "#src/auth/ui/eventorenAuthContextUse.ts"
import { eventorenAuthControlStateCreate } from "#src/auth/ui/eventorenAuthControlStateCreate.ts"
import { createSidebarState } from "#ui/interactive/sidebar/createSidebarState.jsx"

const navigation = [
  { href: "/admin/bestellungen", icon: mdiTicketConfirmationOutline, label: "Bestellungen" },
  { href: "/organizer", icon: mdiBarcodeScan, label: "Ticket-Scanner" },
  { href: "/admin/events", icon: mdiCalendarOutline, label: "Events" },
  { href: "/admin/veranstalter", icon: mdiDomain, label: "Veranstalter" },
  { href: "/admin/mitglieder", icon: mdiAccountGroupOutline, label: "Mitglieder" },
] as const

export function adminShellStateCreate() {
  const sidebarState = createSidebarState()
  const authState = eventorenAuthControlStateCreate()
  const auth = eventorenAuthContextUse()
  const location = useLocation()

  createEffect(
    on(
      () => location().pathname,
      () => sidebarState.openMobile.set(false),
      { defer: true },
    ),
  )

  const activeNavigationItem = () => navigation.find((item) => location().pathname === item.href) ?? navigation[0]

  return {
    activeNavigationItem,
    logout: authState.logout,
    navigation,
    sidebarState,
    user: () => auth.identity() ?? undefined,
  }
}
