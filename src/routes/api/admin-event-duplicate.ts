import { createFileRoute } from "@tanstack/solid-router"
import { ConvexHttpClient } from "convex/browser"
import { catalogEventDuplicateHonoCreate } from "#src/catalog/api/catalogEventDuplicateHonoCreate.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

export const Route = createFileRoute("/api/admin-event-duplicate")({
  server: {
    handlers: {
      POST: ({ request }) => catalogEventDuplicateHonoCreate(new ConvexHttpClient(convexUrlGet())).fetch(request),
    },
  },
  component: () => null,
})
