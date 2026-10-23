import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardMessageAudienceCount } from "../organizerDashboardMessageAudienceCount.ts"

export type OrganizerDashboardMessageSummary = {
  readonly messageId: string
  readonly kind: string
  readonly audienceType: string
  readonly audienceTierKeys: string[]
  readonly subject: string
  readonly status: string
  readonly scheduledAt: string | null
  readonly sentAt: string | null
  readonly recipientCount: number
  readonly deliveryState: string
  readonly deliveryReason: string | null
}

const organizerDashboardMessageListMaxRead = 5000

export const organizerDashboardMessageListQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string() },
  handler: (ctx, args): PromiseResult<{ messages: OrganizerDashboardMessageSummary[]; truncated: boolean }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardMessageListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "nachrichten.senden")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const messages = await ctx.db
        .query("organizerDashboardMessages")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", trimmed))
        .take(organizerDashboardMessageListMaxRead + 1)
      const truncated = messages.length > organizerDashboardMessageListMaxRead
      return createResult({
        truncated,
        messages: messages.slice(0, organizerDashboardMessageListMaxRead).map((message) => ({
          messageId: String(message._id),
          kind: message.kind,
          audienceType: message.audienceType,
          audienceTierKeys: message.audienceTierKeys,
          subject: message.subject,
          status: message.status,
          scheduledAt: message.scheduledAt ?? null,
          sentAt: message.sentAt ?? null,
          recipientCount: message.recipientCount,
          deliveryState: message.deliveryState,
          deliveryReason: message.deliveryReason ?? null,
        })),
      })
    }),
})
