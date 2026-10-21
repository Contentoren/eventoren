import { createFileRoute } from "@tanstack/solid-router"
import { ConvexHttpClient } from "convex/browser"
import { organizerDashboardConvexBackendCreate } from "#src/organizer/dashboard/api/organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardHonoCreate } from "#src/organizer/dashboard/api/organizerDashboardHonoCreate.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

/**
 * POST /api/veranstalter: authenticated JSON access to the 42 organizer
 * dashboard backend operations (foundation, profile, events, admin,
 * migration, contracts, team, orders, finance) via a Hono app with an
 * explicit operation allowlist. Auth is Authorization Bearer only.
 *
 * Deviation note: AGENTS.md asks for webui live query, CLI, Hono HTTP API,
 * TS client, and MCP surfaces. Webui live query, CLI, HTTP, and the TS client
 * are covered by this change; no MCP implementation exists in this repo, so
 * no MCP surface is built here.
 */
export const Route = createFileRoute("/api/veranstalter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const backend = organizerDashboardConvexBackendCreate(new ConvexHttpClient(convexUrlGet()))
        return organizerDashboardHonoCreate(backend).fetch(request)
      },
    },
  },
  component: () => null,
})
