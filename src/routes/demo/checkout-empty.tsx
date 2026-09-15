import { createFileRoute } from "@tanstack/solid-router"
import { DemoCheckout } from "../../demo/ui/DemoCheckout.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/checkout-empty")({
  head: () => demoRouteHeadCreate("Empty checkout demo", "Review the empty checkout state.", "/demo/checkout-empty"),
  component: () => <DemoCheckout empty />,
})
