import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrderStatus } from "../../demo/ui/DemoOrderStatus.tsx"

export const Route = createFileRoute("/demo/order-status")({
  head: () => demoRouteHeadCreate("Order status demo", "Review a local paid order confirmation.", "/demo/order-status"),
  component: () => <DemoOrderStatus scenario="paid" />,
})
