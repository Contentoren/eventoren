import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoCart } from "../../demo/ui/DemoCart.tsx"

export const Route = createFileRoute("/demo/customer_/cart-empty")({
  head: () => demoRouteHeadCreate("Empty cart demo", "Review the empty cart state.", "/demo/customer/cart-empty"),
  component: () => <DemoCart empty />,
})
