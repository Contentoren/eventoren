import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { organizerTicketCheckInApply } from "./organizerTicketCheckInApply.js"
import { organizerTicketCheckInErrorCreate } from "./organizerTicketCheckInErrorCreate.js"
import { organizerTicketCheckInTargetResolve } from "./organizerTicketCheckInTargetResolve.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

export const scannerLinkTicketCheckInMutation = mutation({
  args: {
    code: v.string(),
    eventKey: v.string(),
    ticketCode: v.optional(v.string()),
    ticketId: v.optional(v.id("ticketIssued")),
  },
  handler: async (ctx, args) => {
    const op = "scannerLinkTicketCheckInMutation"
    const allowed = await scannerLinkEventAuthorizeFn(ctx, args.code, args.eventKey)
    if (!allowed.success) return allowed
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
      .unique()
    if (!event) return organizerTicketCheckInErrorCreate(op, "organizer.check-in.event-not-found", "Event unavailable")
    const resolved = await organizerTicketCheckInTargetResolve(ctx, event, args, op)
    if (!resolved.success) {
      // A scanned code may belong to an event outside this link. Preserve the error code,
      // but never reveal the foreign event, ticket ids or order ids in public errors.
      if (
        [
          "organizer.check-in.wrong-event",
          "organizer.check-in.ambiguous-ticket-code",
          "organizer.check-in.order-code-not-accepted",
        ].includes(resolved.code ?? "")
      )
        return organizerTicketCheckInErrorCreate(
          op,
          resolved.code ?? "organizer.check-in.invalid-ticket",
          "Ticket cannot be checked in for this event",
        )
      return resolved
    }
    return organizerTicketCheckInApply(ctx, resolved.data, { link: allowed.data }, op)
  },
})
