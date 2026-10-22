import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardAuditWrite } from "#src/organizer/dashboard/admin/organizerDashboardAuditWrite.ts"

const maxPageSize = 100
const defaultPageSize = 50

type OrganizerDashboardMigrationBackfillResult = {
  scanned: number
  changed: number
  cursor: string
  isDone: boolean
}

/**
 * Backfills ticket order orgId snapshots for one owned event in bounded
 * cursor pages via eventKeyAndCreatedAt. Only sets orgId when absent;
 * a conflicting existing snapshot aborts BEFORE any page write.
 */
export const organizerDashboardMigrationBackfillMutation = mutation({
  args: {
    token: convexV.string(),
    eventKey: convexV.string(),
    cursor: convexV.optional(convexV.string()),
    pageSize: convexV.optional(convexV.number()),
  },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardMigrationBackfillResult> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, data) => {
      const op = "organizerDashboardMigrationBackfillMutation"
      const { userId, eventKey, cursor } = data
      const authorization = await catalogAdminAuthorizeFn(mutationCtx, userId)
      if (!authorization.success) return authorization
      if (eventKey.trim().length === 0) return createResultError(op, "Ein Veranstaltungsschlüssel ist erforderlich.")
      const pageSize = data.pageSize ?? defaultPageSize
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        return createResultError(op, `pageSize must be an integer from 1 to ${maxPageSize}`)
      }
      const events = await mutationCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
        .take(2)
      const event = events[0]
      if (!event) return createResultError(op, "Veranstaltung nicht gefunden.")
      if (events.length > 1) return createResultError(op, "Event key is ambiguous")
      if (event.deletedAt) return createResultError(op, "Event is deleted")
      if (event.orgId === undefined) {
        return createResultError(op, "Event has no owning organization")
      }
      const orderPage = await mutationCtx.db
        .query("ticketOrders")
        .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
        .order("asc")
        .paginate({
          cursor: cursor ?? null,
          numItems: pageSize,
          maximumRowsRead: pageSize,
          maximumBytesRead: 512 * 1024,
        })
      for (const order of orderPage.page) {
        if (order.orgId !== undefined && order.orgId !== event.orgId) {
          return createResultError(op, "Order already has a different organization snapshot")
        }
      }
      const now = new Date().toISOString()
      let changed = 0
      for (const order of orderPage.page) {
        if (order.orgId !== undefined) continue
        await mutationCtx.db.patch("ticketOrders", order._id, {
          orgId: event.orgId,
          updatedAt: now,
        })
        changed += 1
      }
      if (changed > 0) {
        await organizerDashboardAuditWrite(mutationCtx, {
          orgId: event.orgId,
          actorUserId: userId,
          area: "migration",
          action: "migrated",
          note: `backfill:${eventKey}:${changed}`,
          at: now,
        })
      }
      return createResult({
        scanned: orderPage.page.length,
        changed,
        cursor: orderPage.continueCursor,
        isDone: orderPage.isDone,
      })
    }),
})
