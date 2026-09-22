import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/orders-error")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/orders-error", location),
})
