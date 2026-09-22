import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoOrders } from "../../demo/ui/DemoOrders.tsx"

export const Route = createFileRoute("/demo/customer_/orders-signed-out")({
  head: () =>
    demoRouteHeadCreate(
      "Signed-out order history demo",
      "Review the signed-out order history state.",
      "/demo/customer/orders-signed-out",
    ),
  component: () => <DemoOrders scenario="signed-out" />,
})
