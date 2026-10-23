import { organizerContractsCurrentCheck } from "../../../contracts/organizerContractsCurrentCheck.ts"
import type { OrganizerContractParty } from "../../../contracts/organizerContractPartySchema.ts"
import { v as convexV } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.js"

/**
 * Permission-filtered owner profile for settings/onboarding follow-up.
 * Public profile fields go to every organization member; bank details only
 * to bank.bearbeiten OR finanzen.sehen; fee/tax only to finanzen.sehen OR
 * einstellungen.bearbeiten (read-only, no owner mutation exists for them).
 * Revisioned contract evidence is available to authenticated organization members only.
 */
export const organizerDashboardOrganizationGetQuery = query({
  args: { token: convexV.string(), orgId: convexV.id("orgs") },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    orgId: string
    status: string
    configurationConfirmed: boolean
    canAcceptContracts: boolean
    profile: {
      name: string
      slug: string
      kind: string
      contact?: { email?: string; phone?: string }
      imprint?: string
    }
    bank: { iban: string; holder: string } | null
    fee: { percentBps: number; fixedCents: number; payer: string } | null
    tax: { status: string; defaultRateBps: number } | null
    contracts: {
      party?: OrganizerContractParty
      acceptedFee?: { percentBps: number; fixedCents: number; payer: "kaeufer" | "veranstalter" }
      authorityConfirmed?: boolean
      earlyServiceStartRequested?: boolean
      termsAccepted: boolean
      dpaAccepted: boolean
      current: boolean
      termsRevision?: string
      dpaRevision?: string
      termsConsentedAt?: string
      dpaConsentedAt?: string
    }
  }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId }) => {
      const authorization = await organizerDashboardAuthorize(queryCtx, userId, orgId)
      if (!authorization.success) return authorization
      const { permissions, organization, role } = authorization.data
      const bankVisible = permissions.includes("bank.bearbeiten") || permissions.includes("finanzen.sehen")
      const moneyVisible = permissions.includes("finanzen.sehen") || permissions.includes("einstellungen.bearbeiten")
      return createResult({
        canAcceptContracts: role === "inhaber",
        orgId: organization.orgId,
        status: organization.status,
        configurationConfirmed: organization.configurationConfirmed,
        profile: { ...organization.profile },
        bank: bankVisible ? (organization.bank ?? null) : null,
        fee: moneyVisible ? { ...organization.fee } : null,
        tax: moneyVisible ? { ...organization.tax } : null,
        contracts: {
          party: organization.contracts.party,
          acceptedFee: organization.contracts.acceptedFee,
          authorityConfirmed: organization.contracts.authorityConfirmed,
          earlyServiceStartRequested: organization.contracts.earlyServiceStartRequested,
          current:
            organizerContractsCurrentCheck(organization.contracts) &&
            !!organization.contracts.party &&
            !!organization.contracts.acceptedFee,
          termsRevision: organization.contracts.termsRevision,
          dpaRevision: organization.contracts.dpaRevision,
          termsConsentedAt: organization.contracts.termsConsentedAt,
          dpaConsentedAt: organization.contracts.dpaConsentedAt,
          termsAccepted: organization.contracts.termsAcceptedAt !== undefined,
          dpaAccepted: organization.contracts.dpaAcceptedAt !== undefined,
        },
      })
    }),
})
