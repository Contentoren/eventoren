import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"

export const ticketActivationCodeHoldExpireMutation = internalMutation({
  args: {
    codeId: v.id("ticketActivationCodes"),
    holdDigest: v.string(),
    expiresAt: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    readonly released: boolean
    readonly reason: "released" | "stale" | "consumed" | "delegated" | "not_expired" | "missing" | "finalized"
  }> => {
    const code = await ctx.db.get("ticketActivationCodes", args.codeId)
    if (!code) return createResult({ released: false, reason: "missing" })
    // Only the exact hold that was scheduled may be released: a renewed or
    // replaced hold keeps its own window.
    if (code.browserHoldDigest !== args.holdDigest || code.browserHoldExpiresAt !== args.expiresAt)
      return createResult({ released: false, reason: "stale" })
    // A charged code is never released by a browser hold.
    if (code.status === "consumed") return createResult({ released: false, reason: "consumed" })
    if (code.consumedAt !== undefined) {
      // The code was charged by a paid order while this browser hold was still
      // open. It must never become available again. An expired hold that no
      // order owns is finalized as the consumed code of that paid owner; the
      // hold of an attached code stays with its order expiry.
      if (code.orderId !== undefined) return createResult({ released: false, reason: "consumed" })
      const now = Date.now()
      if (code.browserHoldExpiresAt === undefined || code.browserHoldExpiresAt > now)
        return createResult({ released: false, reason: "not_expired" })
      const charged = await ctx.db
        .query("ticketActivationCodeReservations")
        .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", code._id).eq("status", "consumed"))
        .first()
      if (!charged) return createResult({ released: false, reason: "consumed" })
      const chargedOrder = await ctx.db.get("ticketOrders", charged.orderId)
      if (chargedOrder?.paymentStatus !== "paid") return createResult({ released: false, reason: "consumed" })
      // The paid order must really own this code: only then is the charged
      // code finalized for it instead of staying reserved forever.
      const chargedLines = await ctx.db
        .query("ticketOrderLines")
        .withIndex("orderId", (q) => q.eq("orderId", charged.orderId))
        .collect()
      if (chargedLines.filter((line) => line.activationCodeId === code._id).length !== 1)
        return createResult({ released: false, reason: "consumed" })
      await ctx.db.patch("ticketActivationCodes", code._id, {
        status: "consumed",
        orderId: charged.orderId,
        consumedAt: code.consumedAt,
        reservedAt: undefined,
        browserHoldDigest: undefined,
        browserHoldExpiresAt: undefined,
        updatedAt: new Date(now).toISOString(),
      })
      return createResult({ released: false, reason: "finalized" })
    }
    // The code belongs to an order now: the existing safe order expiry owns
    // the release, a provider uncertainty must keep the code held.
    if (code.orderId !== undefined) {
      const order = await ctx.db.get("ticketOrders", code.orderId)
      // The order schedules its own expiry; only a due order is handed over
      // again, so a running checkout is never expired early.
      if (order && order.reservationExpiresAt <= Date.now())
        await ctx.scheduler.runAfter(0, internal.ticketing.ticketReservationExpireAction, {
          orderId: code.orderId,
        })
      return createResult({ released: false, reason: "delegated" })
    }
    const now = Date.now()
    if (code.browserHoldExpiresAt === undefined || code.browserHoldExpiresAt > now)
      return createResult({ released: false, reason: "not_expired" })
    await ctx.db.patch("ticketActivationCodes", code._id, {
      status: "available",
      browserHoldDigest: undefined,
      browserHoldExpiresAt: undefined,
      updatedAt: new Date(now).toISOString(),
    })
    return createResult({ released: true, reason: "released" })
  },
})
