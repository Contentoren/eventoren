import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardAuditWrite } from "./organizerDashboardAuditWrite.ts"

export const organizerDashboardAdminBlockMutation = mutation({
  args: { token: convexV.string(), orgId: convexV.id("orgs"), reason: convexV.string() },
  handler: async (ctx, args): PromiseResult<{ orgId: Id<"orgs"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, reason }) => {
      const op = "organizerDashboardAdminBlockMutation"
      const authorization = await catalogAdminAuthorizeFn(mutationCtx, userId)
      if (!authorization.success) return authorization
      const trimmedReason = reason.trim()
      if (trimmedReason.length === 0) {
        return createResultError(op, "Blocking requires a non-empty reason")
      }
      const organization = await mutationCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique()
      if (!organization) return createResultError(op, "Bitte schließe zuerst das Veranstalter-Onboarding ab.")
      const now = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        status: "gesperrt",
        blockReason: trimmedReason,
        updatedAt: now,
      })
      await organizerDashboardAuditWrite(mutationCtx, {
        orgId,
        actorUserId: userId,
        area: "status",
        action: "blocked",
        at: now,
        note: trimmedReason,
      })
      return createResult({ orgId })
    }),
})
