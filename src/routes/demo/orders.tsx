import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrders } from "../../demo/ui/DemoOrders.tsx"

export const Route = createFileRoute("/demo/orders")({
  head: () => demoRouteHeadCreate("Order history demo", "Review local order history fixtures.", "/demo/orders"),
  component: () => <DemoOrders scenario="populated" />,
})
