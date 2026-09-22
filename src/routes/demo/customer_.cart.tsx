import { createFileRoute } from "@tanstack/solid-router"
import { DemoCart } from "../../demo/ui/DemoCart.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/customer_/cart")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Cart demo",
        description: "Review and edit a local Eventoren ticket cart fixture.",
        path: "/demo/customer/cart",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/customer/cart")],
  }),
  component: DemoCart,
})
