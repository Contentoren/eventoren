import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardPhaseArchiveSchema } from "#src/organizer/dashboard/pricing/organizerDashboardPhaseSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/** Archives one price phase; archived phases no longer resolve and stay readable in history. */
export const organizerDashboardPhaseArchiveMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), phaseId: v.string() },
  handler: (ctx, args): PromiseResult<{ readonly phaseId: Id<"organizerDashboardPricePhases"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, phaseId }) => {
      const op = "organizerDashboardPhaseArchiveMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "tickets.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardPhaseArchiveSchema, { orgId: String(orgId), phaseId })
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      let existing = null
      try {
        existing = await ctx.db.get(
          "organizerDashboardPricePhases",
          parsed.output.phaseId as Id<"organizerDashboardPricePhases">,
        )
      } catch {
        return createResultError(op, "Preisphase nicht verfügbar")
      }
      if (!existing || existing.orgId !== orgId) return createResultError(op, "Preisphase nicht verfügbar")
      await ctx.db.patch(existing._id, { archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      return createResult({ phaseId: existing._id })
    }),
})
