import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrderStatus } from "../../demo/ui/DemoOrderStatus.tsx"

export const Route = createFileRoute("/demo/customer_/order-status-error")({
  head: () =>
    demoRouteHeadCreate(
      "Order status error demo",
      "Review the order status error state.",
      "/demo/customer/order-status-error",
    ),
  component: () => <DemoOrderStatus scenario="error" />,
})
