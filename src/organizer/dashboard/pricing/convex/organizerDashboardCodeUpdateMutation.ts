import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardCodeUpdateSchema } from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardCodeLoad } from "./organizerDashboardCodeLoad.ts"

/** Toggles, limits and re-dates one code; explicit null clears validity bounds and notes. */
export const organizerDashboardCodeUpdateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    codeId: v.string(),
    active: v.optional(v.boolean()),
    maxTickets: v.optional(v.number()),
    validFrom: v.optional(v.union(v.string(), v.null())),
    validUntil: v.optional(v.union(v.string(), v.null())),
    note: v.optional(v.union(v.string(), v.null())),
  },
  handler: (ctx, args): PromiseResult<{ readonly codeId: Id<"organizerDashboardCodes"> }> =>
    authMutationTokenToUserId(
      ctx,
      args,
      async (ctx, { userId, orgId, codeId, active, maxTickets, validFrom, validUntil, note }) => {
        const op = "organizerDashboardCodeUpdateMutation"
        const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "codes.bearbeiten")
        if (!auth.success) return auth
        const parsed = a.safeParse(organizerDashboardCodeUpdateSchema, {
          orgId: String(orgId),
          codeId,
          ...(active !== undefined ? { active } : {}),
          ...(maxTickets !== undefined ? { maxTickets } : {}),
          ...(validFrom !== undefined ? { validFrom } : {}),
          ...(validUntil !== undefined ? { validUntil } : {}),
          ...(note !== undefined ? { note } : {}),
        })
        if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
        const loaded = await organizerDashboardCodeLoad(ctx, orgId, parsed.output.codeId, op)
        if (!loaded.success) return loaded
        const at = new Date().toISOString()
        await ctx.db.patch(loaded.data._id, {
          ...(parsed.output.active !== undefined ? { active: parsed.output.active } : {}),
          ...(parsed.output.maxTickets !== undefined ? { maxTickets: parsed.output.maxTickets } : {}),
          ...(parsed.output.validFrom !== undefined
            ? parsed.output.validFrom === null
              ? { validFrom: undefined }
              : { validFrom: parsed.output.validFrom }
            : {}),
          ...(parsed.output.validUntil !== undefined
            ? parsed.output.validUntil === null
              ? { validUntil: undefined }
              : { validUntil: parsed.output.validUntil }
            : {}),
          ...(parsed.output.note !== undefined
            ? parsed.output.note === null
              ? { note: undefined }
              : { note: parsed.output.note }
            : {}),
          updatedAt: at,
        })
        return createResult({ codeId: loaded.data._id })
      },
    ),
})
