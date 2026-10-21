import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"
import { organizerDashboardOrderAuditWrite } from "./organizerDashboardOrderAuditWrite.ts"

export const organizerDashboardOrderNoteDeleteMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    orderId: v.id("ticketOrders"),
    noteId: v.id("organizerDashboardOrderNotes"),
  },
  handler: (ctx, args): PromiseResult<{ noteId: Id<"organizerDashboardOrderNotes"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, orderId, noteId }) => {
      const op = "organizerDashboardOrderNoteDeleteMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "bestellungen.verwalten")
      if (!auth.success) return auth
      const scope = await organizerDashboardOrderScopeGet(ctx, orgId, orderId, op)
      if (!scope.success) return scope
      const note = await ctx.db.get("organizerDashboardOrderNotes", noteId)
      if (!note || note.orgId !== orgId || note.orderId !== orderId || note.eventKey !== scope.data.order.eventKey)
        return createResultError(op, "Notiz nicht verfügbar")
      await ctx.db.delete("organizerDashboardOrderNotes", noteId)
      await organizerDashboardOrderAuditWrite(ctx, {
        orgId,
        orderId,
        eventKey: note.eventKey,
        actorUserId: userId,
        at: new Date().toISOString(),
        action: "note_deleted",
      })
      return createResult({ noteId })
    }),
})
