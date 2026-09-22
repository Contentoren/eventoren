import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrders } from "../../demo/ui/DemoOrders.tsx"

export const Route = createFileRoute("/demo/customer_/orders-error")({
  head: () =>
    demoRouteHeadCreate(
      "Order history error demo",
      "Review the order history error state.",
      "/demo/customer/orders-error",
    ),
  component: () => <DemoOrders scenario="error" />,
})
