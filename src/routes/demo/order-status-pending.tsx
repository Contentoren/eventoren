import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrderStatus } from "../../demo/ui/DemoOrderStatus.tsx"

export const Route = createFileRoute("/demo/order-status-pending")({
  head: () =>
    demoRouteHeadCreate(
      "Pending order status demo",
      "Review a pending order confirmation.",
      "/demo/order-status-pending",
    ),
  component: () => <DemoOrderStatus scenario="pending" />,
})
