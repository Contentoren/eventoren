import { createFileRoute } from "@tanstack/solid-router"
import { DemoCheckout } from "../../demo/ui/DemoCheckout.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/checkout")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Checkout demo",
        description: "Complete a local Eventoren checkout fixture without payment or backend calls.",
        path: "/demo/checkout",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/checkout")],
  }),
  component: DemoCheckout,
})
