import { createFileRoute } from "@tanstack/solid-router"
import { DemoXyz } from "../../demo/ui/DemoXyz.js"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/xyz")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Workspace pulse demo",
        description: "Interact with a local project workspace fixture without a backend service.",
        path: "/demo/xyz",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/xyz")],
  }),
  component: DemoXyz,
})
