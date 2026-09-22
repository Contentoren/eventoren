import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCheckoutStatus } from "../../demo/ui/DemoCheckoutStatus.tsx"

export const Route = createFileRoute("/demo/customer_/checkout-loaded")({
  head: () =>
    demoRouteHeadCreate(
      "Geladener Checkout",
      "Checkout-Zustand nach dem Laden anzeigen.",
      "/demo/customer/checkout-loaded",
    ),
  component: () => <DemoCheckoutStatus scenario="loaded" />,
})
