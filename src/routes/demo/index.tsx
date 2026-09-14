import { createFileRoute } from "@tanstack/solid-router"
import { DemoDirectory } from "../../demo/ui/DemoDirectory.js"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Demo directory",
        description: "Explore local application demos powered by fixture data.",
        path: "/demo",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo")],
  }),
  component: DemoDirectory,
})
