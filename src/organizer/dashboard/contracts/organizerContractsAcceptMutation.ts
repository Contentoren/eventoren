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
import { organizerContractConsentTransportFields } from "./organizerContractConsentTransportFields.ts"
import { organizerStandardPricing } from "./organizerStandardPricing.ts"
import { organizerDashboardPricingRequestFn } from "../pricing/organizerDashboardPricingRequestFn.ts"

export const organizerContractsAcceptMutation = mutation({
  args: {
    ...organizerContractConsentTransportFields,
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
        return createResultError(op, "Nur die Inhaberin bzw. der Inhaber darf Verträge annehmen.")
      const { organization } = authorization.data
      const snapshot = {
        party: parsed.output.contractParty,
        acceptedFee: { ...organizerStandardPricing, payer: parsed.output.feePayer },
        authorityConfirmed: parsed.output.authorityConfirmed,
        earlyServiceStartRequested: parsed.output.earlyServiceStartRequested,
      }
      const sameParty =
        !organization.contracts.party ||
        Object.entries(snapshot.party).every(
          ([key, value]) => organization.contracts.party?.[key as keyof typeof snapshot.party] === value,
        )
      if (!sameParty)
        return createResultError(op, "Ein Wechsel des Vertragspartners ist über die Vertragsannahme nicht möglich.")
      const sameFee =
        organization.contracts.acceptedFee &&
        Object.entries(snapshot.acceptedFee).every(
          ([key, value]) => organization.contracts.acceptedFee?.[key as keyof typeof snapshot.acceptedFee] === value,
        )
      if (
        organizerContractsCurrentCheck(organization.contracts) &&
        sameParty &&
        sameFee &&
        organization.contracts.authorityConfirmed === true &&
        organization.contracts.earlyServiceStartRequested === snapshot.earlyServiceStartRequested
      )
        return createResult({ orgId })
      const now = new Date().toISOString()
      const feeChanged = Object.entries(snapshot.acceptedFee).some(
        ([key, value]) => organization.fee[key as keyof typeof snapshot.acceptedFee] !== value,
      )
      if (feeChanged) {
        const requested = await organizerDashboardPricingRequestFn(mutationCtx, { orgId, startedByUserId: userId, now })
        if (!requested.success) return requested
      }
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        fee: snapshot.acceptedFee,
        ...(feeChanged ? { configurationConfirmed: false } : {}),
        contracts: {
          ...organization.contracts,
          ...snapshot,
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
      await organizerContractConsentEvidenceCreate(mutationCtx, {
        orgId,
        acceptedAt: now,
        acceptedByUserId: userId,
        ...snapshot,
      })
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
