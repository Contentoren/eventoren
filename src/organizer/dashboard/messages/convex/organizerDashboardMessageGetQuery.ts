import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export type OrganizerDashboardMessageDetail = {
  readonly messageId: string
  readonly eventKey: string
  readonly kind: string
  readonly audienceType: string
  readonly audienceTierKeys: string[]
  readonly subject: string
  readonly body: string
  readonly status: string
  readonly scheduledAt: string | null
  readonly sentAt: string | null
  readonly recipientCount: number
  readonly deliveryState: string
  readonly deliveryReason: string | null
}

export const organizerDashboardMessageGetQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), messageId: v.id("organizerDashboardMessages") },
  handler: (ctx, args): PromiseResult<{ message: OrganizerDashboardMessageDetail }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, messageId }) => {
      const op = "organizerDashboardMessageGetQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const message = await ctx.db.get("organizerDashboardMessages", messageId)
      if (!message || message.orgId !== orgId) return createResultError(op, "Nachricht nicht verfügbar")
      return createResult({
        message: {
          messageId: String(message._id),
          eventKey: message.eventKey,
          kind: message.kind,
          audienceType: message.audienceType,
          audienceTierKeys: message.audienceTierKeys,
          subject: message.subject,
          body: message.body,
          status: message.status,
          scheduledAt: message.scheduledAt ?? null,
          sentAt: message.sentAt ?? null,
          recipientCount: message.recipientCount,
          deliveryState: message.deliveryState,
          deliveryReason: message.deliveryReason ?? null,
        },
      })
    }),
})
