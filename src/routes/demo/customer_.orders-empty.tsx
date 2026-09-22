import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrders } from "../../demo/ui/DemoOrders.tsx"

export const Route = createFileRoute("/demo/customer_/orders-empty")({
  head: () =>
    demoRouteHeadCreate(
      "Empty order history demo",
      "Review the empty order history state.",
      "/demo/customer/orders-empty",
    ),
  component: () => <DemoOrders scenario="empty" />,
})
