import { mdiAccountGroupOutline } from "@adaptive-ds/mdi/mdiAccountGroupOutline.js"
import { mdiBarcodeScan } from "@adaptive-ds/mdi/mdiBarcodeScan.js"
import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import type { DemoAdminNavItem } from "../model/DemoAdminNavItem.ts"

export function demoAdminNavStateCreate(inputs: { readonly pathname: () => string }) {
  const items = (): readonly DemoAdminNavItem[] => {
    const current = inputs.pathname()
    return [
      {
        href: "/demo/admin/orders",
        label: "Bestellungen",
        icon: mdiTicketConfirmationOutline,
        active: current === "/demo/admin/orders",
      },
      {
        href: "/demo/admin/events",
        label: "Events",
        icon: mdiCalendarOutline,
        active:
          current === "/demo/admin/events" ||
          current === "/demo/admin/events/new" ||
          current === "/demo/admin/events-empty" ||
          current === "/demo/admin/events-error" ||
          current === "/demo/admin/events-unauthorized",
      },
      {
        href: "/demo/admin/organizers",
        label: "Veranstalter",
        icon: mdiDomain,
        active: current === "/demo/admin/organizers",
      },
      {
        href: "/demo/admin/members",
        label: "Mitglieder",
        icon: mdiAccountGroupOutline,
        active: current === "/demo/admin/members",
      },
      {
        href: "/demo/admin/organizer",
        label: "Ticket-Scanner",
        icon: mdiBarcodeScan,
        active:
          current === "/demo/admin/organizer" ||
          current === "/demo/admin/organizer-empty" ||
          current.startsWith("/demo/admin/organizer/"),
      },
    ]
  }

  return { items }
}
