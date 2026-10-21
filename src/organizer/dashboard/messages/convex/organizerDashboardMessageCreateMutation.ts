import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardMessageContentSchema } from "../organizerDashboardMessageSchema.ts"
import { organizerDashboardMessageRecipientsCount } from "./organizerDashboardMessageRecipientsCount.ts"

export const organizerDashboardMessageCreateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    ...valibotObjectToConvexFields(organizerDashboardMessageContentSchema),
  },
  handler: (ctx, args): PromiseResult<{ messageId: string; recipientCount: number }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, ...input }) => {
      const op = "organizerDashboardMessageCreateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", trimmed))
        .unique()
      if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
      const parsed = a.safeParse(organizerDashboardMessageContentSchema, input)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const recipientCount = await organizerDashboardMessageRecipientsCount(ctx, event.eventKey, parsed.output.audience)
      const now = new Date().toISOString()
      const created = await ctx.db.insert("organizerDashboardMessages", {
        orgId,
        eventKey: event.eventKey,
        kind: parsed.output.kind,
        audienceType: parsed.output.audience.type,
        audienceTierKeys: [...parsed.output.audience.tierKeys],
        subject: parsed.output.subject,
        body: parsed.output.body,
        status: "entwurf",
        recipientCount,
        deliveryState: "queued",
        deliveryAttempts: 0,
        createdAt: now,
        updatedAt: now,
      })
      return createResult({ messageId: String(created), recipientCount })
    }),
})
