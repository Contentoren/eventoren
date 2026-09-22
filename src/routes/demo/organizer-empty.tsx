import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/organizer-empty")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/admin/organizer-empty", location),
})
