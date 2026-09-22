import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/admin_/veranstalter")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/admin/organizers", location),
})
