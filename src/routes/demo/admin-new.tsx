import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/admin-new")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/admin/events/new", location),
})
