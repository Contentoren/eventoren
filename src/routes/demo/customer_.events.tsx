import { createFileRoute } from "@tanstack/solid-router"
import { DemoCatalog } from "../../demo/ui/DemoCatalog.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/customer_/events")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Event catalog demo",
        description: "Browse a backend-free Eventoren catalog fixture.",
        path: "/demo/customer/events",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/customer/events")],
  }),
  component: DemoCatalog,
})
