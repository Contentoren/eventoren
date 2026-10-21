import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardGuestSchema } from "../organizerDashboardGuestSchema.ts"
import { organizerDashboardGuestScopeGet } from "./organizerDashboardGuestScopeGet.ts"

const organizerDashboardGuestUpsertArgsSchema = a.object({
  ...organizerDashboardGuestSchema.entries,
  quotaId: a.optional(a.string()),
})

export const organizerDashboardGuestUpsertMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    guestId: v.optional(v.id("organizerDashboardGuests")),
    ...valibotObjectToConvexFields(organizerDashboardGuestUpsertArgsSchema),
  },
  handler: (ctx, args): PromiseResult<{ guestId: string }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, guestId, ...input }) => {
      const op = "organizerDashboardGuestUpsertMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardGuestUpsertArgsSchema, input)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const quotaId = parsed.output.quotaId?.trim() ? parsed.output.quotaId.trim() : null
      let quotaDocId: Parameters<typeof organizerDashboardGuestScopeGet>[3] = null
      if (quotaId !== null) {
        try {
          quotaDocId = ctx.db.normalizeId("organizerDashboardGuestQuotas", quotaId)
        } catch {
          return createResultError(op, "Kontingent nicht verfügbar")
        }
        if (!quotaDocId) return createResultError(op, "Kontingent nicht verfügbar")
      }
      const scope = await organizerDashboardGuestScopeGet(ctx, orgId, eventKey.trim(), quotaDocId, op)
      if (!scope.success) return scope
      // A full quota refuses new seats; edits keep their own seats.
      if (scope.data.quota && guestId === undefined) {
        const assigned = await ctx.db
          .query("organizerDashboardGuests")
          .withIndex("quotaId", (q) => q.eq("quotaId", scope.data.quota!._id))
          .collect()
        const used = assigned.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0)
        if (used + 1 + parsed.output.plusOnes > scope.data.quota.limit)
          return createResultError(op, "Kontingent ist voll")
      }
      const now = new Date().toISOString()
      const patch = {
        quotaId: scope.data.quota ? scope.data.quota._id : undefined,
        name: parsed.output.name,
        email: parsed.output.email || undefined,
        plusOnes: parsed.output.plusOnes,
        note: parsed.output.note || undefined,
        updatedAt: now,
      }
      if (guestId !== undefined) {
        const existing = await ctx.db.get("organizerDashboardGuests", guestId)
        if (!existing || existing.orgId !== orgId || existing.eventKey !== scope.data.event.eventKey)
          return createResultError(op, "Gast nicht verfügbar")
        await ctx.db.patch("organizerDashboardGuests", guestId, patch)
        return createResult({ guestId: String(guestId) })
      }
      const created = await ctx.db.insert("organizerDashboardGuests", {
        orgId,
        eventKey: scope.data.event.eventKey,
        createdAt: now,
        ...patch,
      })
      return createResult({ guestId: String(created) })
    }),
})
