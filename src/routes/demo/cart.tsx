import { createFileRoute } from "@tanstack/solid-router"
import { DemoCart } from "../../demo/ui/DemoCart.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/cart")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Cart demo",
        description: "Review and edit a local Eventoren ticket cart fixture.",
        path: "/demo/cart",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/cart")],
  }),
  component: DemoCart,
})
