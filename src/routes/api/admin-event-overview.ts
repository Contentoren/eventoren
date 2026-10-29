import { createFileRoute } from "@tanstack/solid-router"
import { ConvexHttpClient } from "convex/browser"
import { catalogEventOverviewHonoCreate } from "#src/catalog/api/catalogEventOverviewHonoCreate.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

export const Route = createFileRoute("/api/admin-event-overview")({
  server: {
    handlers: {
      POST: ({ request }) => catalogEventOverviewHonoCreate(new ConvexHttpClient(convexUrlGet())).fetch(request),
    },
  },
  component: () => null,
})
