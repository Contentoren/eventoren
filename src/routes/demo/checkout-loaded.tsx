import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/checkout-loaded")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/checkout-loaded", location),
})
