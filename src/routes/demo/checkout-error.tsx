import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCheckout } from "../../demo/ui/DemoCheckout.tsx"

export const Route = createFileRoute("/demo/checkout-error")({
  head: () =>
    demoRouteHeadCreate("Checkout error demo", "Review the local checkout error state.", "/demo/checkout-error"),
  component: () => <DemoCheckout error />,
})
