import * as v from "valibot"
import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardOrganizationUpdateSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationUpdateSchema.ts"
import { organizerDashboardAuthorize } from "./organizerDashboardAuthorize.js"

export const organizerDashboardOrganizationUpdateMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    name: convexV.optional(convexV.string()),
    kind: convexV.optional(convexV.string()),
    contactEmail: convexV.optional(convexV.string()),
    contactPhone: convexV.optional(convexV.string()),
    imprint: convexV.optional(convexV.string()),
    iban: convexV.optional(convexV.string()),
    bankHolder: convexV.optional(convexV.string()),
  },
  handler: async (ctx, args): PromiseResult<{ orgId: Id<"orgs"> }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, data) => {
      const op = "organizerDashboardOrganizationUpdateMutation"
      const { userId, orgId, ...fields } = data
      const profile =
        fields.name !== undefined ||
        fields.kind !== undefined ||
        fields.contactEmail !== undefined ||
        fields.contactPhone !== undefined ||
        fields.imprint !== undefined
          ? {
              ...(fields.name !== undefined ? { name: fields.name } : {}),
              ...(fields.kind !== undefined ? { kind: fields.kind } : {}),
              ...(fields.contactEmail !== undefined || fields.contactPhone !== undefined
                ? {
                    contact: {
                      ...(fields.contactEmail !== undefined ? { email: fields.contactEmail } : {}),
                      ...(fields.contactPhone !== undefined ? { phone: fields.contactPhone } : {}),
                    },
                  }
                : {}),
              ...(fields.imprint !== undefined ? { imprint: fields.imprint } : {}),
            }
          : undefined
      const bank =
        fields.iban !== undefined || fields.bankHolder !== undefined
          ? {
              ...(fields.iban !== undefined ? { iban: fields.iban } : {}),
              ...(fields.bankHolder !== undefined ? { holder: fields.bankHolder } : {}),
            }
          : undefined
      const parsed = v.safeParse(organizerDashboardOrganizationUpdateSchema, {
        orgId,
        ...(profile !== undefined ? { profile } : {}),
        ...(bank !== undefined ? { bank } : {}),
      })
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      if (parsed.output.profile !== undefined) {
        const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "profil.bearbeiten")
        if (!authorization.success) return authorization
      }
      if (parsed.output.bank !== undefined) {
        const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "bank.bearbeiten")
        if (!authorization.success) return authorization
      }
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId)
      if (!authorization.success) return authorization
      const { organization } = authorization.data
      const now = new Date().toISOString()
      if (parsed.output.profile?.name !== undefined) {
        await mutationCtx.db.patch("orgs", orgId, { name: parsed.output.profile.name, updatedAt: now })
      }
      const nextContactEmail = parsed.output.profile?.contact?.email ?? organization.profile.contact?.email
      const nextContactPhone = parsed.output.profile?.contact?.phone ?? organization.profile.contact?.phone
      const nextImprint = parsed.output.profile?.imprint ?? organization.profile.imprint
      await mutationCtx.db.patch("organizerDashboardOrganizations", organization._id, {
        ...(parsed.output.profile !== undefined
          ? {
              profile: {
                name: parsed.output.profile.name ?? organization.profile.name,
                slug: organization.profile.slug,
                kind: parsed.output.profile.kind ?? organization.profile.kind,
                ...(nextContactEmail !== undefined || nextContactPhone !== undefined
                  ? {
                      contact: {
                        ...(nextContactEmail !== undefined ? { email: nextContactEmail } : {}),
                        ...(nextContactPhone !== undefined ? { phone: nextContactPhone } : {}),
                      },
                    }
                  : {}),
                ...(nextImprint !== undefined ? { imprint: nextImprint } : {}),
              },
            }
          : {}),
        ...(parsed.output.bank !== undefined ? { bank: { ...parsed.output.bank } } : {}),
        updatedAt: now,
      })
      return createResult({ orgId })
    }),
})
