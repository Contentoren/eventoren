import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardMessageContentSchema } from "../organizerDashboardMessageSchema.ts"
import { organizerDashboardMessageRecipientsCount } from "./organizerDashboardMessageRecipientsCount.ts"

export const organizerDashboardMessageUpdateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    messageId: v.id("organizerDashboardMessages"),
    ...valibotObjectToConvexFields(organizerDashboardMessageContentSchema),
  },
  handler: (ctx, args): PromiseResult<{ messageId: string; recipientCount: number }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, messageId, ...input }) => {
      const op = "organizerDashboardMessageUpdateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const message = await ctx.db.get("organizerDashboardMessages", messageId)
      if (!message || message.orgId !== orgId) return createResultError(op, "Nachricht nicht verfügbar")
      if (message.status === "gesendet") return createResultError(op, "Gesendete Nachricht ist fixiert")
      const parsed = a.safeParse(organizerDashboardMessageContentSchema, input)
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const recipientCount = await organizerDashboardMessageRecipientsCount(
        ctx,
        message.eventKey,
        parsed.output.audience,
      )
      await ctx.db.patch("organizerDashboardMessages", messageId, {
        kind: parsed.output.kind,
        audienceType: parsed.output.audience.type,
        audienceTierKeys: [...parsed.output.audience.tierKeys],
        subject: parsed.output.subject,
        body: parsed.output.body,
        recipientCount,
        updatedAt: new Date().toISOString(),
      })
      return createResult({ messageId: String(messageId), recipientCount })
    }),
})
