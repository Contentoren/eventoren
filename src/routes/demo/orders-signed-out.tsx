import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/orders-signed-out")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/orders-signed-out", location),
})
