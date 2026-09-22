import { createFileRoute } from "@tanstack/solid-router"
import { DemoAdminOrganizers } from "../../demo/ui/DemoAdminOrganizers.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/admin_/organizers")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Admin-Veranstalter-Demo",
        description: "Lokale Eventoren-Demo zur Verwaltung von Veranstaltern ohne Backend-Aufrufe.",
        path: "/demo/admin/organizers",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin/organizers")],
  }),
  component: DemoAdminOrganizers,
})
