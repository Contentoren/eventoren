import * as v from "valibot"
import { query } from "#convex/_generated/server.js"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { organizerTerminationReceiptSchema } from "./organizerTerminationReceiptSchema.ts"
export const organizerTerminationReceiptQuery = query({
  args: valibotToConvex(organizerTerminationReceiptSchema.entries),
  handler: async (ctx, args) => {
    if (!v.safeParse(organizerTerminationReceiptSchema, args).success) return null
    const row = await ctx.db
      .query("organizerTerminationRequests")
      .withIndex("requestKey", (q) => q.eq("requestKey", args.requestKey))
      .unique()
    if (!row || row.receiptToken !== args.receiptToken) return null
    const delivery = await ctx.db
      .query("organizerTerminationDeliveries")
      .withIndex("requestId", (q) => q.eq("requestId", row._id))
      .unique()
    return {
      id: row._id,
      declaration: row.declaration,
      receivedAt: row.receivedAt,
      delivery: delivery
        ? {
            status: delivery.status,
            attempts: delivery.attempts,
            userSent: delivery.userSent,
            operatorSent: delivery.operatorSent,
            lastError: delivery.lastError,
          }
        : null,
    }
  },
})
