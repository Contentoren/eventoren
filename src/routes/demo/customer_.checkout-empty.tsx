import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCheckout } from "../../demo/ui/DemoCheckout.tsx"

export const Route = createFileRoute("/demo/customer_/checkout-empty")({
  head: () =>
    demoRouteHeadCreate("Empty checkout demo", "Review the empty checkout state.", "/demo/customer/checkout-empty"),
  component: () => <DemoCheckout empty />,
})
