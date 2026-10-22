import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardMessageReminderSchema } from "../organizerDashboardMessageSchema.ts"

export const organizerDashboardMessageReminderUpdateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    ...valibotObjectToConvexFields(organizerDashboardMessageReminderSchema),
  },
  handler: (ctx, args): PromiseResult<{ updated: boolean }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, ...input }) => {
      const op = "organizerDashboardMessageReminderUpdateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", trimmed))
        .unique()
      if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
      const parsed = a.safeParse(organizerDashboardMessageReminderSchema, input)
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const now = new Date().toISOString()
      const existing = await ctx.db
        .query("organizerDashboardMessageReminders")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", event.eventKey))
        .unique()
      if (existing) {
        await ctx.db.patch("organizerDashboardMessageReminders", existing._id, {
          ...parsed.output,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert("organizerDashboardMessageReminders", {
          orgId,
          eventKey: event.eventKey,
          ...parsed.output,
          createdAt: now,
          updatedAt: now,
        })
      }
      return createResult({ updated: true })
    }),
})
