import { v as convexV } from "convex/values"
import * as v from "valibot"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardOrganizationCreateSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationCreateSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardAuditWrite } from "../admin/organizerDashboardAuditWrite.ts"
import { organizerContractConsentEvidenceCreate } from "../contracts/organizerContractConsentEvidenceCreate.ts"

export const organizerDashboardOrganizationCreateMutation = mutation({
  args: {
    token: convexV.string(),
    name: convexV.string(),
    slug: convexV.string(),
    kind: convexV.string(),
    contactEmail: convexV.optional(convexV.string()),
    contactPhone: convexV.optional(convexV.string()),
    imprint: convexV.optional(convexV.string()),
    iban: convexV.optional(convexV.string()),
    bankHolder: convexV.optional(convexV.string()),
    termsRevision: convexV.string(),
    dpaRevision: convexV.string(),
    termsAccepted: convexV.boolean(),
    dpaAccepted: convexV.boolean(),
  },
  handler: async (ctx, args): PromiseResult<{ orgId: Id<"orgs"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, data) => {
      const op = "organizerDashboardOrganizationCreateMutation"
      const { userId, ...fields } = data
      const contact =
        fields.contactEmail !== undefined || fields.contactPhone !== undefined
          ? {
              ...(fields.contactEmail !== undefined ? { email: fields.contactEmail } : {}),
              ...(fields.contactPhone !== undefined ? { phone: fields.contactPhone } : {}),
            }
          : undefined
      const bank =
        fields.iban !== undefined || fields.bankHolder !== undefined
          ? {
              ...(fields.iban !== undefined ? { iban: fields.iban } : {}),
              ...(fields.bankHolder !== undefined ? { holder: fields.bankHolder } : {}),
            }
          : undefined
      const parsed = v.safeParse(organizerDashboardOrganizationCreateSchema, {
        name: fields.name,
        slug: fields.slug,
        kind: fields.kind,
        ...(contact !== undefined ? { contact } : {}),
        ...(fields.imprint !== undefined ? { imprint: fields.imprint } : {}),
        ...(bank !== undefined ? { bank } : {}),
        termsRevision: fields.termsRevision,
        dpaRevision: fields.dpaRevision,
        termsAccepted: fields.termsAccepted,
        dpaAccepted: fields.dpaAccepted,
      })
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      const user = await mutationCtx.db.get("users", userId)
      if (!user || user.deletedAt) return createResultError(op, "User not found")
      const slugTakenByOrg = await mutationCtx.db
        .query("orgs")
        .withIndex("orgHandle", (q) => q.eq("orgHandle", parsed.output.slug))
        .unique()
      if (slugTakenByOrg) return createResultError(op, "Diese Kurzadresse ist bereits vergeben.")
      const slugTakenByConfig = await mutationCtx.db
        .query("organizerDashboardOrganizations")
        .withIndex("slug", (q) => q.eq("profile.slug", parsed.output.slug))
        .unique()
      if (slugTakenByConfig) return createResultError(op, "Diese Kurzadresse ist bereits vergeben.")
      const now = new Date().toISOString()
      const orgId = await mutationCtx.db.insert("orgs", {
        orgHandle: parsed.output.slug,
        name: parsed.output.name,
        createdAt: now,
        updatedAt: now,
      })
      await mutationCtx.db.insert("orgMembers", {
        orgId,
        userId,
        orgHandle: parsed.output.slug,
        role: "member",
        organizerRole: "inhaber",
        invitedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      await mutationCtx.db.insert("organizerDashboardOrganizations", {
        orgId,
        status: "pruefung",
        profile: {
          name: parsed.output.name,
          slug: parsed.output.slug,
          kind: parsed.output.kind,
          ...(parsed.output.contact !== undefined ? { contact: { ...parsed.output.contact } } : {}),
          ...(parsed.output.imprint !== undefined ? { imprint: parsed.output.imprint } : {}),
        },
        ...(parsed.output.bank !== undefined ? { bank: { ...parsed.output.bank } } : {}),
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: {
          termsAcceptedAt: now,
          dpaAcceptedAt: now,
          termsRevision: parsed.output.termsRevision,
          dpaRevision: parsed.output.dpaRevision,
          termsConsentedAt: now,
          dpaConsentedAt: now,
          consentedByUserId: userId,
        },
        configurationConfirmed: false,
        createdAt: now,
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
