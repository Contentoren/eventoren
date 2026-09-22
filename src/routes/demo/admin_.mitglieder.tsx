import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/admin_/mitglieder")({
  beforeLoad: ({ location }) => demoLegacyRouteRedirect("/demo/admin/members", location),
})
