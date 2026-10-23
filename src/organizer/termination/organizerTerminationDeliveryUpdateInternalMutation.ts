import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
export const organizerTerminationDeliveryUpdateInternalMutation = internalMutation({
  args: {
    requestId: v.id("organizerTerminationRequests"),
    attempt: v.number(),
    userSent: v.boolean(),
    operatorSent: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("organizerTerminationDeliveries")
      .withIndex("requestId", (q) => q.eq("requestId", args.requestId))
      .unique()
    if (!row || row.attempts !== args.attempt) return
    const userSent = row.userSent || args.userSent
    const operatorSent = row.operatorSent || args.operatorSent
    const status = userSent && operatorSent ? ("sent" as const) : ("failed" as const)
    await ctx.db.patch(row._id, {
      userSent,
      operatorSent,
      status,
      updatedAt: Date.now(),
      lastError: status === "failed" ? "E-Mail-Zustellung fehlgeschlagen; erneuter Versuch vorgesehen." : undefined,
    })
    if (args.error)
      console.error("organizerTermination email", {
        requestId: args.requestId,
        attempt: args.attempt,
        error: args.error,
      })
    if (status === "failed" && args.attempt < 8)
      await ctx.scheduler.runAfter(
        Math.min(3_600_000, 60_000 * 2 ** args.attempt),
        internal.organizerTerminationEmail.organizerTerminationEmailInternalAction,
        { requestId: args.requestId },
      )
  },
})
