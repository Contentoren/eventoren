import { createFileRoute } from "@tanstack/solid-router"
import { DemoAdmin } from "../../demo/ui/DemoAdmin.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/admin")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Catalog administration demo",
        description: "Edit a local Eventoren event catalog fixture without auth or backend calls.",
        path: "/demo/admin",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin")],
  }),
  component: DemoAdmin,
})
