import { internalMutation } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { createResult, createResultError, type PromiseResult } from "#result"

export const ticketOrderAccessCapabilityRevokeMutation = internalMutation({
  args: { orderId: v.id("ticketOrders") },
  handler: async (ctx, args): PromiseResult<{ orderId: string; revokedAt: string }> => {
    const op = "ticketOrderAccessCapabilityRevokeMutation"
    const order = await ctx.db.get(args.orderId)
    if (!order) return createResultError(op, "The order was not found")
    const revokedAt = order.emailAccessRevokedAt ?? new Date().toISOString()
    await ctx.db.patch("ticketOrders", args.orderId, { emailAccessRevokedAt: revokedAt, updatedAt: revokedAt })
    return createResult({ orderId: args.orderId, revokedAt })
  },
})
