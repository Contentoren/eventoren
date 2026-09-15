import { createFileRoute } from "@tanstack/solid-router"
import { DemoCart } from "../../demo/ui/DemoCart.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/cart-empty")({
  head: () => demoRouteHeadCreate("Empty cart demo", "Review the empty cart state.", "/demo/cart-empty"),
  component: () => <DemoCart empty />,
})
