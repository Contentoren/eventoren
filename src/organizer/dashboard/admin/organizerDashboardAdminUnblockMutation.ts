import * as v from "valibot"
import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardOrganizationStatusSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationStatusSchema.ts"
import { organizerDashboardAdminActivationCheck } from "./organizerDashboardAdminActivationCheck.ts"
import { organizerDashboardAuditWrite } from "./organizerDashboardAuditWrite.ts"

export const organizerDashboardAdminUnblockMutation = mutation({
  args: { token: convexV.string(), orgId: convexV.id("orgs"), status: convexV.string() },
  handler: async (ctx, args): PromiseResult<{ orgId: Id<"orgs"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, status }) => {
      const op = "organizerDashboardAdminUnblockMutation"
      const authorization = await catalogAdminAuthorizeFn(mutationCtx, userId)
      if (!authorization.success) return authorization
      const parsed = v.safeParse(organizerDashboardOrganizationStatusSchema, status)
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      if (parsed.output === "gesperrt") {
        return createResultError(op, "Unblocking requires an explicit status of pruefung or aktiv")
      }
      const organization = await mutationCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique()
      if (!organization) return createResultError(op, "Organization onboarding required")
      if (organization.status !== "gesperrt") {
        return createResultError(op, "Only blocked organizations can be unblocked")
      }
      if (parsed.output === "aktiv") {
        const readiness = organizerDashboardAdminActivationCheck(organization)
        if (!readiness.success) return readiness
      }
      const now = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        status: parsed.output,
        blockReason: undefined,
        updatedAt: now,
      })
      await organizerDashboardAuditWrite(mutationCtx, {
        orgId,
        actorUserId: userId,
        area: "status",
        action: "unblocked",
        at: now,
        note: parsed.output,
      })
      return createResult({ orgId })
    }),
})
