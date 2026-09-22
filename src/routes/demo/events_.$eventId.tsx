import { createFileRoute } from "@tanstack/solid-router"
import { demoLegacyRouteRedirect } from "../../demo/model/demoLegacyRouteRedirect.ts"

export const Route = createFileRoute("/demo/events_/$eventId")({
  beforeLoad: ({ location, params }) =>
    demoLegacyRouteRedirect(`/demo/customer/events/${encodeURIComponent(params.eventId)}`, location),
})
