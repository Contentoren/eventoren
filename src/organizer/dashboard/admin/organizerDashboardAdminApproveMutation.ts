import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardAdminActivationCheck } from "./organizerDashboardAdminActivationCheck.ts"
import { organizerDashboardAuditWrite } from "./organizerDashboardAuditWrite.ts"

export const organizerDashboardAdminApproveMutation = mutation({
  args: { token: convexV.string(), orgId: convexV.id("orgs") },
  handler: async (ctx, args): PromiseResult<{ orgId: Id<"orgs"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId }) => {
      const op = "organizerDashboardAdminApproveMutation"
      const authorization = await catalogAdminAuthorizeFn(mutationCtx, userId)
      if (!authorization.success) return authorization
      const organization = await mutationCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique()
      if (!organization) return createResultError(op, "Bitte schließe zuerst das Veranstalter-Onboarding ab.")
      if (organization.status !== "pruefung") {
        return createResultError(op, "Nur Organisationen in Prüfung können freigegeben werden.")
      }
      const readiness = organizerDashboardAdminActivationCheck(organization)
      if (!readiness.success) return readiness
      const now = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        status: "aktiv",
        blockReason: undefined,
        updatedAt: now,
      })
      await organizerDashboardAuditWrite(mutationCtx, {
        orgId,
        actorUserId: userId,
        area: "status",
        action: "approved",
        at: now,
      })
      return createResult({ orgId })
    }),
})
