import * as v from "valibot"
import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardAdminConfigureSchema } from "./organizerDashboardAdminConfigureSchema.ts"
import { organizerDashboardAuditWrite } from "./organizerDashboardAuditWrite.ts"
import { organizerDashboardPricingRequestFn } from "#src/organizer/dashboard/pricing/organizerDashboardPricingRequestFn.ts"

export const organizerDashboardAdminConfigureMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    tax: convexV.object({ status: convexV.string(), defaultRateBps: convexV.number() }),
    fee: convexV.object({
      percentBps: convexV.number(),
      fixedCents: convexV.number(),
      payer: convexV.string(),
    }),
  },
  handler: async (ctx, args): PromiseResult<{ orgId: Id<"orgs"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, data) => {
      const op = "organizerDashboardAdminConfigureMutation"
      const { userId, orgId, tax, fee } = data
      const authorization = await catalogAdminAuthorizeFn(mutationCtx, userId)
      if (!authorization.success) return authorization
      const parsed = v.safeParse(organizerDashboardAdminConfigureSchema, {
        orgId,
        tax,
        fee,
      })
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      const organization = await mutationCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique()
      if (!organization) return createResultError(op, "Organization onboarding required")
      const now = new Date().toISOString()
      const feeChanged =
        organization.fee.percentBps !== parsed.output.fee.percentBps ||
        organization.fee.fixedCents !== parsed.output.fee.fixedCents ||
        organization.fee.payer !== parsed.output.fee.payer
      const wasConfirmed = organization.configurationConfirmed
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        tax: { ...parsed.output.tax },
        fee: { ...parsed.output.fee },
        configurationConfirmed: true,
        configuredAt: now,
        updatedAt: now,
      })
      if (feeChanged || !wasConfirmed) {
        const requested = await organizerDashboardPricingRequestFn(mutationCtx, {
          orgId,
          startedByUserId: userId,
          now,
        })
        if (!requested.success) return requested
      }
      await organizerDashboardAuditWrite(mutationCtx, {
        orgId,
        actorUserId: userId,
        area: "configuration",
        action: "configured",
        at: now,
      })
      return createResult({ orgId })
    }),
})
