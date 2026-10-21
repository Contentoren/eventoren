import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardEventLoad } from "#src/organizer/dashboard/events/convex/organizerDashboardEventLoad.ts"
import {
  type OrganizerDashboardEventDetail,
  organizerDashboardEventDetailCreate,
} from "#src/organizer/dashboard/events/model/organizerDashboardEventDetailCreate.ts"
import { organizerDashboardEventFinancialsVisible } from "#src/organizer/dashboard/events/model/organizerDashboardEventFinancialsVisible.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const organizerDashboardEventGetValidator = v.object({
  orgId: v.id("orgs"),
  eventKey: v.string(),
  token: v.string(),
})

const organizerDashboardEventTierTakeLimit = 51

export const organizerDashboardEventGetQuery = query({
  args: organizerDashboardEventGetValidator,
  handler: (ctx, args): PromiseResult<OrganizerDashboardEventDetail> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, eventKey }) => {
      const authorization = await organizerDashboardAuthorize(queryCtx, userId, orgId)
      if (!authorization.success) return authorization
      const eventResult = await organizerDashboardEventLoad(queryCtx, orgId, eventKey)
      if (!eventResult.success) return eventResult
      const event = eventResult.data
      const tiers = await queryCtx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id))
        .take(organizerDashboardEventTierTakeLimit)
      return createResult(
        organizerDashboardEventDetailCreate(
          event,
          tiers,
          organizerDashboardEventFinancialsVisible(authorization.data.permissions),
        ),
      )
    }),
})
