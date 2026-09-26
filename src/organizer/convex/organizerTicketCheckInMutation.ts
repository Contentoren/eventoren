import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerTicketCheckInApply } from "./organizerTicketCheckInApply.js"
import { organizerTicketCheckInTicketResolve } from "./organizerTicketCheckInTicketResolve.js"

export const organizerTicketCheckInMutation = mutation({
  args: {
    eventKey: v.string(),
    ticketCode: v.optional(v.string()),
    ticketId: v.optional(v.id("ticketIssued")),
    token: v.string(),
  },
  handler: async (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId }) => {
      const op = "organizerTicketCheckInMutation"
      const resolved = await organizerTicketCheckInTicketResolve(mutationCtx, userId, args, op)
      if (!resolved.success) return resolved
      return organizerTicketCheckInApply(mutationCtx, resolved.data, { user: resolved.data.user }, op)
    }),
})
