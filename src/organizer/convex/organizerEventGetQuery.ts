import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"
import { organizerEventProjectionCreate } from "./organizerEventProjectionCreate.js"

export const organizerEventGetQuery = query({
  args: { eventKey: v.string(), token: v.string() },
  handler: async (ctx, args): PromiseResult<ReturnType<typeof organizerEventProjectionCreate>> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const globalAuthorization = await organizerAuthorizeFn(queryCtx, userId)
      if (!globalAuthorization.success) return globalAuthorization

      const event = await queryCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
        .unique()
      if (!event) return createResultError("organizerEventGetQuery", "The event was not found")

      const eventAuthorization = await organizerAuthorizeFn(queryCtx, userId, event.startsAt)
      if (!eventAuthorization.success) return eventAuthorization

      return createResult(organizerEventProjectionCreate(event))
    }),
})
