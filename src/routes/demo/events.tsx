import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/events")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/customer/events", location),
})
