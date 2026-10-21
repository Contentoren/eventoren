import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardMessageIcsCreate } from "../organizerDashboardMessageIcsCreate.ts"

/**
 * Calendar entry (.ics) for one event reminder. UTC instants; the mail body
 * shows Europe/Berlin times. The location falls back to venue + city.
 */
export const organizerDashboardMessageIcsGetQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string() },
  handler: (ctx, args): PromiseResult<{ ics: string; filename: string }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardMessageIcsGetQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", trimmed))
        .unique()
      if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
      const location = `${event.venue}, ${event.city}`.trim().replace(/^[,\s]+|[,\s]+$/g, "")
      const ics = organizerDashboardMessageIcsCreate({
        uid: `reminder-${event.eventKey}@eventoren`,
        title: event.title,
        description: event.description || undefined,
        location: location || undefined,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      })
      return createResult({ ics, filename: `erinnerung-${event.eventKey}.ics` })
    }),
})
