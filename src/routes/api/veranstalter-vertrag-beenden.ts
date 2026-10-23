import { createFileRoute } from "@tanstack/solid-router"
import { ConvexHttpClient } from "convex/browser"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { organizerTerminationHonoCreate } from "#src/organizer/termination/organizerTerminationHonoCreate.ts"
export const Route = createFileRoute("/api/veranstalter-vertrag-beenden")({
  server: {
    handlers: {
      POST: ({ request }) => organizerTerminationHonoCreate(new ConvexHttpClient(convexUrlGet())).fetch(request),
    },
  },
  component: () => null,
})
