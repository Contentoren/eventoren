import { createFileRoute } from "@tanstack/solid-router"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/admin_/events")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Katalogverwaltung-Demo",
        description: "Lokale Eventoren-Demo zur Bearbeitung eines Eventkatalogs ohne Anmeldung oder Backend-Aufrufe.",
        path: "/demo/admin/events",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin/events")],
  }),
  component: DemoAdmin,
})
