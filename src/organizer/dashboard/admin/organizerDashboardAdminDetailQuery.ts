import { organizerContractsCurrentCheck } from "../contracts/organizerContractsCurrentCheck.ts"
import { v as convexV } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"

export const organizerDashboardAdminDetailQuery = query({
  args: { token: convexV.string(), orgId: convexV.id("orgs") },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    orgId: string
    status: string
    profile: { name: string; slug: string; kind: string }
    bank: { iban: string; holder: string } | null
    tax: { status: string; defaultRateBps: number }
    fee: { percentBps: number; fixedCents: number; payer: string }
    contracts: {
      current: boolean
      termsAcceptedAt?: string
      dpaAcceptedAt?: string
      termsRevision?: string
      dpaRevision?: string
      termsConsentedAt?: string
      dpaConsentedAt?: string
    }
    configurationConfirmed: boolean
    pricingStatus: string
    feeRevision: number
  }> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, orgId }) => {
      const op = "organizerDashboardAdminDetailQuery"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      const organization = await authorizedCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique()
      if (!organization) return createResultError(op, "Bitte schließe zuerst das Veranstalter-Onboarding ab.")
      return createResult({
        orgId: organization.orgId,
        status: organization.status,
        profile: {
          name: organization.profile.name,
          slug: organization.profile.slug,
          kind: organization.profile.kind,
        },
        bank: organization.bank ?? null,
        tax: { ...organization.tax },
        fee: { ...organization.fee },
        contracts: { ...organization.contracts, current: organizerContractsCurrentCheck(organization.contracts) },
        configurationConfirmed: organization.configurationConfirmed,
        pricingStatus: organization.pricingStatus ?? "ready",
        feeRevision: organization.feeRevision ?? 0,
      })
    }),
})
