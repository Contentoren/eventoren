import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"

/**
 * Revokes a helper scanner link. The link must cover the authorized org;
 * revocation is idempotent and never reveals capability codes.
 */
export const organizerDashboardAdmissionScannerLinkRevokeMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), linkId: v.id("scannerLinks") },
  handler: (ctx, args): PromiseResult<{ linkId: Id<"scannerLinks"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, linkId }) => {
      const op = "organizerDashboardAdmissionScannerLinkRevokeMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "tickets.bearbeiten")
      if (!auth.success) return auth
      const link = await mutationCtx.db.get("scannerLinks", linkId)
      if (!link || link.role !== "helper") return createResultError(op, "Scanner-Link nicht gefunden")
      const coversOrg = link.eventKeys.some((key) => (link.eventOrgIds?.[key] ?? null) === orgId)
      if (!coversOrg) return createResultError(op, "Scanner-Link nicht gefunden")
      if (link.revokedAt === undefined) {
        await mutationCtx.db.patch("scannerLinks", linkId, { revokedAt: Date.now() })
      }
      return createResult({ linkId })
    }),
})
