import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult } from "#result"
import { scannerLinkAuthorizeFn } from "./scannerLinkAuthorizeFn.js"
import { scannerLinkEventAuthorizeFn } from "./scannerLinkEventAuthorizeFn.js"

export const scannerLinkContextQuery = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const authorization = await scannerLinkAuthorizeFn(ctx, code)
    if (!authorization.success) return authorization
    const { name, role, eventKeys, expiresAt } = authorization.data
    const events = []
    for (const eventKey of eventKeys) {
      const allowed = await scannerLinkEventAuthorizeFn(ctx, code, eventKey)
      if (!allowed.success) continue
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .unique()
      if (!event) continue
      events.push({ eventKey, title: event.title })
    }
    return createResult({ name, role, expiresAt, events })
  },
})
