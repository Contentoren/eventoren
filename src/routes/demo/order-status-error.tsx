import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrderStatus } from "../../demo/ui/DemoOrderStatus.tsx"

export const Route = createFileRoute("/demo/order-status-error")({
  head: () =>
    demoRouteHeadCreate("Order status error demo", "Review the order status error state.", "/demo/order-status-error"),
  component: () => <DemoOrderStatus scenario="error" />,
})
