import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { organizerEventProjectionCreate } from "./organizerEventProjectionCreate.js"
import { scannerLinkAuthorizeFn } from "./scannerLinkAuthorizeFn.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

// Links contain at most 50 explicitly selected event keys; never scan the catalog.
export const scannerLinkEventListQuery = query({
  args: { code: v.string() },
  handler: async (ctx, { code }): PromiseResult<readonly ReturnType<typeof organizerEventProjectionCreate>[]> => {
    const authorization = await scannerLinkAuthorizeFn(ctx, code)
    if (!authorization.success) return authorization
    const events = []
    for (const eventKey of authorization.data.eventKeys) {
      const allowed = await scannerLinkEventAuthorizeFn(ctx, code, eventKey)
      if (!allowed.success) continue
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .unique()
      if (event) events.push(organizerEventProjectionCreate(event))
    }
    return createResult(events)
  },
})
