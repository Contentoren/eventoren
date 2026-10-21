import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

export const organizerDashboardMessageDeleteMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), messageId: v.id("organizerDashboardMessages") },
  handler: (ctx, args): PromiseResult<{ deleted: boolean }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, messageId }) => {
      const op = "organizerDashboardMessageDeleteMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const message = await ctx.db.get("organizerDashboardMessages", messageId)
      if (!message || message.orgId !== orgId) return createResultError(op, "Nachricht nicht verfügbar")
      if (message.status === "gesendet") return createResultError(op, "Gesendete Nachricht ist fixiert")
      await ctx.db.delete(messageId)
      return createResult({ deleted: true })
    }),
})
