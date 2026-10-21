import { v as convexV } from "convex/values"
import * as v from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardAuditWrite } from "../admin/organizerDashboardAuditWrite.ts"
import { organizerDashboardAuthorize } from "../convex/organizerDashboardAuthorize.ts"
import { organizerContractConsentEvidenceCreate } from "./organizerContractConsentEvidenceCreate.ts"
import { organizerContractConsentSchema } from "./organizerContractConsentSchema.ts"
import { organizerContractsCurrentCheck } from "./organizerContractsCurrentCheck.ts"

export const organizerContractsAcceptMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    termsAccepted: convexV.boolean(),
    dpaAccepted: convexV.boolean(),
    termsRevision: convexV.string(),
    dpaRevision: convexV.string(),
  },
  handler: (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...consent }) => {
      const op = "organizerContractsAcceptMutation"
      const parsed = v.safeParse(organizerContractConsentSchema, consent)
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId)
      if (!authorization.success) return authorization
      if (authorization.data.role !== "inhaber")
        return createResultError(op, "Only the organization owner may accept contracts")
      const { organization } = authorization.data
      // Idempotent retries must not replace evidence timestamps or the accepting actor.
      if (organizerContractsCurrentCheck(organization.contracts)) return createResult({ orgId })
      const now = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        contracts: {
          ...organization.contracts,
          termsAcceptedAt: organization.contracts.termsAcceptedAt ?? now,
          dpaAcceptedAt: organization.contracts.dpaAcceptedAt ?? now,
          termsRevision: parsed.output.termsRevision,
          dpaRevision: parsed.output.dpaRevision,
          termsConsentedAt: now,
          dpaConsentedAt: now,
          consentedByUserId: userId,
        },
        updatedAt: now,
      })
      await organizerContractConsentEvidenceCreate(mutationCtx, { orgId, acceptedAt: now, acceptedByUserId: userId })
      await organizerDashboardAuditWrite(mutationCtx, {
        orgId,
        actorUserId: userId,
        area: "contracts",
        action: "accepted",
        at: now,
        note: `terms=${parsed.output.termsRevision}; dpa=${parsed.output.dpaRevision}`,
      })
      return createResult({ orgId })
    }),
})
