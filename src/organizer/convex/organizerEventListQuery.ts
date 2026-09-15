import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerAuthorizeFn } from "./organizerAuthorizeFn.js"

type OrganizerEventItem = {
  id: string
  eventKey: string
  title: string
  imageUrl: string
  imageAlt: string
  startsAt: string
  endsAt: string
  doorsAt: string
  status: "draft" | "published" | "archived"
}

export const organizerEventListQuery = query({
  args: { token: v.string() },
  handler: async (ctx, args): PromiseResult<readonly OrganizerEventItem[]> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const globalAuthorization = await organizerAuthorizeFn(queryCtx, userId)
      if (!globalAuthorization.success) return globalAuthorization

      const events = await queryCtx.db.query("catalogEvents").collect()
      const visibleEvents: OrganizerEventItem[] = []
      for (const event of events) {
        const authorization = await organizerAuthorizeFn(queryCtx, userId, event.startsAt)
        if (!authorization.success) continue
        visibleEvents.push({
          id: event._id,
          eventKey: event.eventKey,
          title: event.title,
          imageUrl: event.imageUrl,
          imageAlt: event.imageAlt,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          doorsAt: event.doorsAt,
          status: event.status,
        })
      }

      visibleEvents.sort((left, right) => eventStartsAtCompare(left.startsAt, right.startsAt))
      return createResult(visibleEvents)
    }),
})

function eventStartsAtCompare(left: string, right: string): number {
  const leftTimestamp = Date.parse(left)
  const rightTimestamp = Date.parse(right)
  if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) return leftTimestamp - rightTimestamp
  if (Number.isFinite(leftTimestamp)) return -1
  if (Number.isFinite(rightTimestamp)) return 1
  return left.localeCompare(right)
}
