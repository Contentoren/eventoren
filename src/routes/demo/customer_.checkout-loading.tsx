import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCheckoutStatus } from "../../demo/ui/DemoCheckoutStatus.tsx"

export const Route = createFileRoute("/demo/customer_/checkout-loading")({
  head: () =>
    demoRouteHeadCreate("Checkout wird geladen", "Checkout-Ladezustand anzeigen.", "/demo/customer/checkout-loading"),
  component: () => <DemoCheckoutStatus scenario="loading" />,
})
