import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/events-error")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/events-error", location),
})
