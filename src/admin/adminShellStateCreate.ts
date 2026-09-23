import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiBarcodeScan } from "@adaptive-ds/mdi/mdiBarcodeScan.js"
import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { useLocation } from "@tanstack/solid-router"
import { createEffect, on } from "solid-js"
import { eventorenAuthContextUse } from "#src/auth/ui/eventorenAuthContextUse.ts"
import { eventorenAuthControlStateCreate } from "#src/auth/ui/eventorenAuthControlStateCreate.ts"
import { adminListViewPreferenceStateCreate } from "#src/viewPreference/adminListViewPreferenceStateCreate.ts"
import { createSidebarState } from "#ui/interactive/sidebar/createSidebarState.jsx"

const adminNavigation = [
  { href: "/admin/bestellungen", icon: mdiTicketConfirmationOutline, label: "Bestellungen" },
  { href: "/organizer", icon: mdiBarcodeScan, label: "Ticket-Scanner" },
  { href: "/admin/events", icon: mdiCalendarOutline, label: "Events" },
  { href: "/admin/veranstalter", icon: mdiDomain, label: "Veranstalter" },
  { href: "/admin/mitglieder", icon: mdiAccountGroupOutline, label: "Mitglieder" },
] as const

const organizerNavigation = [{ href: "/organizer", icon: mdiCalendarOutline, label: "Events" }] as const

export function adminShellStateCreate(area: "admin" | "organizer" = "admin") {
  const navigation = area === "organizer" ? organizerNavigation : adminNavigation
  const sidebarState = createSidebarState()
  const authState = eventorenAuthControlStateCreate()
  const listViewPreference = adminListViewPreferenceStateCreate()
  const auth = eventorenAuthContextUse()
  const location = useLocation()

  createEffect(
    on(
      () => location().pathname,
      () => sidebarState.openMobile.set(false),
      { defer: true },
    ),
  )

  const activeNavigationItem = () =>
    navigation.find((item) => location().pathname === item.href || location().pathname.startsWith(`${item.href}/`)) ??
    navigation[0]

  return {
    areaLabel: area === "organizer" ? "Veranstalter" : "Admin",
    activeNavigationItem: () =>
      area === "organizer" && location().pathname.startsWith("/organizer/event/")
        ? { href: "/organizer", icon: mdiBarcodeScan, label: "Ticket-Scanner" }
        : activeNavigationItem(),
    activeNavigationHref: () => activeNavigationItem().href,
    logout: authState.logout,
    listViewPreference,
    navigation,
    sidebarState,
    user: () => auth.identity() ?? undefined,
  }
}
