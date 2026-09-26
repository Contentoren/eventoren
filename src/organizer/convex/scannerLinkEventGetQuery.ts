import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { organizerEventProjectionCreate } from "./organizerEventProjectionCreate.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

export const scannerLinkEventGetQuery = query({
  args: { code: v.string(), eventKey: v.string() },
  handler: async (ctx, { code, eventKey }) => {
    const allowed = await scannerLinkEventAuthorizeFn(ctx, code, eventKey)
    if (!allowed.success) return allowed
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event) return createResultError("scannerLinkEventGetQuery", "Event unavailable")
    return createResult(organizerEventProjectionCreate(event))
  },
})
