import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export type OrganizerDashboardMessageReminderDto = {
  readonly enabled: boolean
  readonly hoursBefore: number
  readonly directions: string
  readonly calendar: boolean
  readonly sentAt: string | null
}

export const organizerDashboardMessageReminderGetQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string() },
  handler: (ctx, args): PromiseResult<{ reminder: OrganizerDashboardMessageReminderDto }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardMessageReminderGetQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const reminder = await ctx.db
        .query("organizerDashboardMessageReminders")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", trimmed))
        .unique()
      return createResult({
        reminder: reminder
          ? {
              enabled: reminder.enabled,
              hoursBefore: reminder.hoursBefore,
              directions: reminder.directions,
              calendar: reminder.calendar,
              sentAt: reminder.sentAt ?? null,
            }
          : { enabled: true, hoursBefore: 24, directions: "", calendar: true, sentAt: null },
      })
    }),
})
