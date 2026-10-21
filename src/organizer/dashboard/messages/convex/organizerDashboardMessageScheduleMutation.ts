import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

export const organizerDashboardMessageScheduleMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    messageId: v.id("organizerDashboardMessages"),
    scheduledAt: v.string(),
  },
  handler: (ctx, args): PromiseResult<{ messageId: string; scheduledAt: string }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, messageId, scheduledAt }) => {
      const op = "organizerDashboardMessageScheduleMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const at = new Date(scheduledAt.trim())
      if (Number.isNaN(at.getTime())) return createResultError(op, "Ungültiger Zeitpunkt")
      if (at.getTime() <= Date.now()) return createResultError(op, "Zeitpunkt liegt in der Vergangenheit")
      const message = await ctx.db.get("organizerDashboardMessages", messageId)
      if (!message || message.orgId !== orgId) return createResultError(op, "Nachricht nicht verfügbar")
      if (message.status === "gesendet") return createResultError(op, "Gesendete Nachricht ist fixiert")
      await ctx.db.patch("organizerDashboardMessages", messageId, {
        status: "geplant",
        scheduledAt: at.toISOString(),
        updatedAt: new Date().toISOString(),
      })
      return createResult({ messageId: String(messageId), scheduledAt: at.toISOString() })
    }),
})
