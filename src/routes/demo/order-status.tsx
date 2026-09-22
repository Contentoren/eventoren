import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/order-status")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/order-status", location),
})
