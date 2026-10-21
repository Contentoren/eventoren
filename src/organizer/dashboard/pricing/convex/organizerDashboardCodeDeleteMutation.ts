import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardCodeArchiveSchema } from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardCodeLoad } from "./organizerDashboardCodeLoad.ts"

/** Deletes one unused code; used codes stay as redemption evidence. */

export const organizerDashboardCodeDeleteMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), codeId: v.string() },
  handler: (ctx, args): PromiseResult<{ readonly codeId: Id<"organizerDashboardCodes"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, codeId }) => {
      const op = "organizerDashboardCodeDeleteMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "codes.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardCodeArchiveSchema, { orgId: String(orgId), codeId })
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const loaded = await organizerDashboardCodeLoad(ctx, orgId, parsed.output.codeId, op)
      if (!loaded.success) return loaded
      if (loaded.data.usedTickets > 0) {
        return createResultError(op, "Benutzte Codes bleiben als Nachweis erhalten")
      }
      await ctx.db.delete(loaded.data._id)
      return createResult({ codeId: loaded.data._id })
    }),
})
