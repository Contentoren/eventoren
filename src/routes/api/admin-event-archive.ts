import { createFileRoute } from "@tanstack/solid-router"
import { ConvexHttpClient } from "convex/browser"
import { catalogEventArchiveHonoCreate } from "#src/catalog/api/catalogEventArchiveHonoCreate.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

export const Route = createFileRoute("/api/admin-event-archive")({
  server: {
    handlers: {
      POST: ({ request }) => catalogEventArchiveHonoCreate(new ConvexHttpClient(convexUrlGet())).fetch(request),
    },
  },
  component: () => null,
})
