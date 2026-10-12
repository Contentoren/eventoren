import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.js"
import type { TicketActivationCodeExport } from "#src/ticketing/TicketActivationCodeExport.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

// Bounded single-query snapshot: keeps the export response within feasible
// sizes. Larger inventories stay paginated through the list query instead.
const ticketActivationCodeExportLimitMax = 20000

export const ticketActivationCodeExportAdminQuery = query({
  args: {
    token: v.string(),
    eventKey: v.string(),
    tierKey: v.string(),
  },
  handler: async (ctx, args): PromiseResult<TicketActivationCodeExport> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, authorizedArgs) => {
      const op = "ticketActivationCodeExportAdminQuery"
      const adminResult = await catalogAdminAuthorizeFn(authorizedCtx, authorizedArgs.userId)
      if (!adminResult.success) return adminResult
      const event = await authorizedCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", authorizedArgs.eventKey.trim()))
        .unique()
      if (!event || event.deletedAt) return createResultError(op, "Das Event wurde nicht gefunden")
      const tier = await authorizedCtx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", authorizedArgs.tierKey.trim()))
        .unique()
      if (!tier || tier.archivedAt) return createResultError(op, "Das Ticketprodukt wurde nicht gefunden")

      const stored = await authorizedCtx.db
        .query("ticketActivationCodes")
        .withIndex("tierIdAndNumber", (q) => q.eq("tierId", tier._id))
        .order("asc")
        .take(ticketActivationCodeExportLimitMax + 1)
      if (stored.length > ticketActivationCodeExportLimitMax)
        return createResultError(op, "Zu viele Codes für einen Export. Bitte den Bestand aufteilen")

      // Export intentionally carries only number/code: no statuses, orders, or
      // customer contact, with event/product names exactly once as metadata.
      return createResult({
        eventName: event.title,
        productName: tier.name,
        codes: stored.map((code) => ({ number: code.number, code: code.code })),
      })
    }),
})
