import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardMessageDeliverActionReference } from "../organizerDashboardMessageDeliverActionReference.ts"

/**
 * Queues one message for delivery. The message must be a draft or scheduled;
 * an in-flight `sending` claim is never reset and requires reconciliation.
 * The delivery itself is honest: without a mail provider it ends as
 * `skipped`, never as a pretended send.
 */
export const organizerDashboardMessageSendMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), messageId: v.id("organizerDashboardMessages") },
  handler: (ctx, args): PromiseResult<{ messageId: string; deliveryState: string }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, messageId }) => {
      const op = "organizerDashboardMessageSendMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const message = await mutationCtx.db.get("organizerDashboardMessages", messageId)
      if (!message || message.orgId !== orgId) return createResultError(op, "Nachricht nicht verfügbar")
      if (message.status === "gesendet" || message.deliveryState === "sent")
        return createResultError(op, "Nachricht wurde bereits gesendet")
      if (message.deliveryState === "sending")
        return createResultError(op, "Versand läuft bereits oder ist unklar; bitte prüfen")
      if (message.deliveryState === "queued" && message.status === "geplant")
        return createResultError(op, "Versand ist bereits eingeplant")
      const now = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardMessages", messageId, {
        status: "geplant",
        scheduledAt: now,
        deliveryState: "queued",
        deliveryReason: undefined,
        updatedAt: now,
      })
      await mutationCtx.scheduler.runAfter(0, organizerDashboardMessageDeliverActionReference, {
        messageId,
      })
      return createResult({ messageId: String(messageId), deliveryState: "queued" })
    }),
})
