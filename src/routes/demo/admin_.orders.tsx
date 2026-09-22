import { createFileRoute } from "@tanstack/solid-router"
import { DemoAdminTicketOrders } from "../../demo/ui/DemoAdminTicketOrders.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/admin_/orders")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Admin-Bestellungen-Demo",
        description: "Lokale Eventoren-Demo zur Verwaltung aller Ticketbestellungen ohne Backend-Aufrufe.",
        path: "/demo/admin/orders",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin/orders")],
  }),
  component: DemoAdminTicketOrders,
})
