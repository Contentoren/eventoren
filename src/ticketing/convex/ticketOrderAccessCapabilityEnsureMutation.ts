import { internalMutation } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketOrderAccessCapabilityEnsure } from "./ticketOrderAccessCapabilityEnsure.js"

export const ticketOrderAccessCapabilityEnsureMutation = internalMutation({
  args: { orderId: v.id("ticketOrders"), publicBaseUrl: v.string() },
  handler: async (ctx, args): PromiseResult<{ orderId: string; accessUrl: string; replayed: boolean }> => {
    const op = "ticketOrderAccessCapabilityEnsureMutation"
    let baseUrl: URL
    try {
      baseUrl = new URL(args.publicBaseUrl)
    } catch (error) {
      return createResultError(op, "The public base URL is invalid", String(error))
    }
    if (baseUrl.username || baseUrl.password || (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:"))
      return createResultError(op, "The public base URL is invalid")
    const before = await ctx.db
      .query("ticketOrderDeliveries")
      .withIndex("orderId", (q) => q.eq("orderId", args.orderId))
      .first()
    const ensured = await ticketOrderAccessCapabilityEnsure(ctx, args.orderId)
    if (!ensured.success) return ensured
    const url = new URL("/checkout", baseUrl.origin)
    url.hash = `ticketAccess=${ensured.data.accessToken}`
    return createResult({ orderId: args.orderId, accessUrl: url.toString(), replayed: before !== null })
  },
})
