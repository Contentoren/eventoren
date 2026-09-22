import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrderStatus } from "../../demo/ui/DemoOrderStatus.tsx"

export const Route = createFileRoute("/demo/customer_/order-status")({
  head: () =>
    demoRouteHeadCreate("Order status demo", "Review a local paid order confirmation.", "/demo/customer/order-status"),
  component: () => <DemoOrderStatus scenario="paid" />,
})
