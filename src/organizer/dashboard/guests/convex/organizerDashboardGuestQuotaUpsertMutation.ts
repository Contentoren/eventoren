import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardGuestQuotaSchema } from "../organizerDashboardGuestSchema.ts"
import { organizerDashboardGuestScopeGet } from "./organizerDashboardGuestScopeGet.ts"

export const organizerDashboardGuestQuotaUpsertMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    quotaId: v.optional(v.id("organizerDashboardGuestQuotas")),
    ...valibotObjectToConvexFields(organizerDashboardGuestQuotaSchema),
  },
  handler: (ctx, args): PromiseResult<{ quotaId: string }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, quotaId, ...input }) => {
      const op = "organizerDashboardGuestQuotaUpsertMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const scope = await organizerDashboardGuestScopeGet(ctx, orgId, eventKey.trim(), quotaId ?? null, op)
      if (!scope.success) return scope
      const parsed = a.safeParse(organizerDashboardGuestQuotaSchema, input)
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const now = new Date().toISOString()
      if (quotaId !== undefined) {
        if (!scope.data.quota) return createResultError(op, "Kontingent nicht verfügbar")
        await ctx.db.patch("organizerDashboardGuestQuotas", quotaId, {
          name: parsed.output.name,
          limit: parsed.output.limit,
          updatedAt: now,
        })
        return createResult({ quotaId: String(quotaId) })
      }
      const created = await ctx.db.insert("organizerDashboardGuestQuotas", {
        orgId,
        eventKey: scope.data.event.eventKey,
        name: parsed.output.name,
        limit: parsed.output.limit,
        createdAt: now,
        updatedAt: now,
      })
      return createResult({ quotaId: String(created) })
    }),
})
