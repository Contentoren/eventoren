import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardCodeGenerate } from "#src/organizer/dashboard/pricing/organizerDashboardCodeGenerate.ts"
import { organizerDashboardCodeNormalize } from "#src/organizer/dashboard/pricing/organizerDashboardCodeNormalize.ts"
import { organizerDashboardVoucherExpiry } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherExpiry.ts"
import { organizerDashboardVoucherIssueSchema } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

function organizerDashboardVoucherRandom(): () => number {
  const words = crypto.getRandomValues(new Uint32Array(64))
  let cursor = 0
  return () => {
    const word = words[cursor % words.length] as number
    cursor += 1
    return word / 2 ** 32
  }
}

/**
 * Issues one organization voucher. The code is normalized or generated, the
 * expiry follows the validity choice (Berlin end of day, stored UTC), and the
 * voucher starts with its full balance. Vouchers are only valid at their own
 * organization.
 */
export const organizerDashboardVoucherIssueMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    code: v.optional(v.string()),
    initialCents: v.number(),
    validity: v.union(
      v.literal("1-jahr"),
      v.literal("2-jahre"),
      v.literal("3-jahre-jahresende"),
      v.literal("unbegrenzt"),
      v.literal("datum"),
    ),
    customDate: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{ readonly voucherId: Id<"organizerDashboardVouchers">; readonly code: string }> =>
    authMutationTokenToUserId(
      ctx,
      args,
      async (
        ctx,
        { userId, orgId, code, initialCents, validity, customDate, recipientName, recipientEmail, message },
      ) => {
        const op = "organizerDashboardVoucherIssueMutation"
        const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gutscheine.bearbeiten")
        if (!auth.success) return auth
        const parsed = a.safeParse(organizerDashboardVoucherIssueSchema, {
          orgId: String(orgId),
          ...(code !== undefined ? { code } : {}),
          initialCents,
          validity,
          ...(customDate !== undefined ? { customDate } : {}),
          ...(recipientName !== undefined ? { recipientName } : {}),
          ...(recipientEmail !== undefined ? { recipientEmail } : {}),
          ...(message !== undefined ? { message } : {}),
        })
        if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
        const input = parsed.output
        if (input.validity === "datum" && input.customDate === undefined) {
          return createResultError(op, "Eigenes Datum erforderlich")
        }
        const at = new Date().toISOString()
        const expiresAt = organizerDashboardVoucherExpiry(at, input.validity, input.customDate ?? null)
        if (input.validity !== "unbegrenzt" && expiresAt === null) {
          return createResultError(op, "Gültigkeit nicht berechenbar")
        }
        const taken = new Set(
          (
            await ctx.db
              .query("organizerDashboardVouchers")
              .withIndex("orgId", (q) => q.eq("orgId", orgId))
              .collect()
          ).map((row) => row.code),
        )
        const normalized =
          input.code === undefined
            ? (organizerDashboardCodeGenerate({
                count: 1,
                length: 8,
                existing: [...taken],
                random: organizerDashboardVoucherRandom(),
              })[0] as string)
            : organizerDashboardCodeNormalize(input.code)
        if (normalized === undefined || !/^[A-Z0-9-]{4,32}$/.test(normalized) || taken.has(normalized)) {
          return createResultError(op, "Code ungültig oder bereits vergeben")
        }
        const voucherId = await ctx.db.insert("organizerDashboardVouchers", {
          orgId,
          code: normalized,
          initialCents: input.initialCents,
          balanceCents: input.initialCents,
          validity: input.validity,
          ...(expiresAt !== null ? { expiresAt } : {}),
          status: "aktiv",
          ...(input.recipientName !== undefined ? { recipientName: input.recipientName } : {}),
          ...(input.recipientEmail !== undefined ? { recipientEmail: input.recipientEmail } : {}),
          ...(input.message !== undefined ? { message: input.message } : {}),
          createdAt: at,
          updatedAt: at,
        })
        return createResult({ voucherId, code: normalized })
      },
    ),
})
