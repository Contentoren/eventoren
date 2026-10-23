import * as v from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { createResult, createResultError } from "#result"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { organizerTerminationReceiptSchema } from "./organizerTerminationReceiptSchema.ts"
export const organizerTerminationRetryMutation = mutation({
  args: valibotToConvex(organizerTerminationReceiptSchema.entries),
  handler: async (ctx, args) => {
    const error = () =>
      createResultError("organizerTerminationRetry", "Nicht verfügbar oder erneuter Versuch noch nicht möglich.")
    if (!v.safeParse(organizerTerminationReceiptSchema, args).success) return error()
    const row = await ctx.db
      .query("organizerTerminationRequests")
      .withIndex("requestKey", (q) => q.eq("requestKey", args.requestKey))
      .unique()
    if (!row || row.receiptToken !== args.receiptToken) return error()
    const delivery = await ctx.db
      .query("organizerTerminationDeliveries")
      .withIndex("requestId", (q) => q.eq("requestId", row._id))
      .unique()
    if (!delivery || delivery.status === "sent" || Date.now() - delivery.updatedAt < 300_000) return error()
    await ctx.db.patch(delivery._id, { status: "pending", attempts: 0, updatedAt: Date.now() })
    await ctx.scheduler.runAfter(0, internal.organizerTerminationEmail.organizerTerminationEmailInternalAction, {
      requestId: row._id,
    })
    return createResult(null)
  },
})
