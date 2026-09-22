import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/cart-empty")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/cart-empty", location),
})
