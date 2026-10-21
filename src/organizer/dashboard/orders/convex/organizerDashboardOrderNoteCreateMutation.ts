import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardOrderNoteTextSchema } from "../model/organizerDashboardOrderNoteTextSchema.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"
import { organizerDashboardOrderAuditWrite } from "./organizerDashboardOrderAuditWrite.ts"

export const organizerDashboardOrderNoteCreateMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), orderId: v.id("ticketOrders"), text: v.string() },
  handler: (ctx, args): PromiseResult<{ noteId: Id<"organizerDashboardOrderNotes"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, orderId, text }) => {
      const op = "organizerDashboardOrderNoteCreateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "bestellungen.verwalten")
      if (!auth.success) return auth
      const scope = await organizerDashboardOrderScopeGet(ctx, orgId, orderId, op)
      if (!scope.success) return scope
      const parsed = a.safeParse(organizerDashboardOrderNoteTextSchema, text)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const at = new Date().toISOString()
      const eventKey = scope.data.order.eventKey
      const noteId = await ctx.db.insert("organizerDashboardOrderNotes", {
        orgId,
        orderId,
        eventKey,
        authorUserId: userId,
        text: parsed.output,
        createdAt: at,
      })
      await organizerDashboardOrderAuditWrite(ctx, {
        orgId,
        orderId,
        eventKey,
        actorUserId: userId,
        at,
        action: "note_added",
      })
      return createResult({ noteId })
    }),
})
