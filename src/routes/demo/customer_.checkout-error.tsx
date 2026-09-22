import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCheckout } from "../../demo/ui/DemoCheckout.tsx"

export const Route = createFileRoute("/demo/customer_/checkout-error")({
  head: () =>
    demoRouteHeadCreate(
      "Checkout error demo",
      "Review the local checkout error state.",
      "/demo/customer/checkout-error",
    ),
  component: () => <DemoCheckout error />,
})
