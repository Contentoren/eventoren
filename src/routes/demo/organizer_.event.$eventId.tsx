import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/organizer_/event/$eventId")({
  beforeLoad: ({ location, params }) =>
    demoLegacyRouteRedirect(`/demo/admin/organizer/event/${encodeURIComponent(params.eventId)}`, location),
})
