import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/orders")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/orders", location),
})
