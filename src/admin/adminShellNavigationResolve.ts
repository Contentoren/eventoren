import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiBarcodeScan } from "@adaptive-ds/mdi/mdiBarcodeScan.js"
import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"

const adminNavigation = [
  { href: "/admin/bestellungen", icon: mdiTicketConfirmationOutline, label: "Bestellungen" },
  { href: "/organizer", icon: mdiBarcodeScan, label: "Ticket-Scanner" },
  { href: "/admin/scanner-links", icon: mdiBarcodeScan, label: "Scanner-Freigabelinks" },
  { href: "/admin/events", icon: mdiCalendarOutline, label: "Events" },
  { href: "/admin/veranstalter", icon: mdiDomain, label: "Veranstalter" },
  { href: "/admin/mitglieder", icon: mdiAccountGroupOutline, label: "Mitglieder" },
] as const

const organizerNavigation = [{ href: "/organizer", icon: mdiCalendarOutline, label: "Events" }] as const

export function adminShellNavigationResolve(area: "admin" | "organizer", isAdmin: boolean) {
  return area === "admin" || isAdmin ? adminNavigation : organizerNavigation
}
