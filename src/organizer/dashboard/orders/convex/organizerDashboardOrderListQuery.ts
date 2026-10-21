import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import * as a from "valibot"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardOrderListFilterSchema } from "../model/organizerDashboardOrderListFilterSchema.ts"
import { organizerDashboardOrderCursorCreate } from "../model/organizerDashboardOrderCursorCreate.ts"
import { organizerDashboardOrderCursorParse } from "../model/organizerDashboardOrderCursorParse.ts"
import {
  organizerDashboardOrderSummaryCreate,
  type OrganizerDashboardOrderSummary,
} from "../model/organizerDashboardOrderSummaryCreate.ts"
import { organizerDashboardOrderEventScopeGet } from "./organizerDashboardOrderEventScopeGet.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"
import { organizerDashboardOrderPageRead } from "./organizerDashboardOrderPageRead.ts"

export const organizerDashboardOrderListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    ...valibotObjectToConvexFields(organizerDashboardOrderListFilterSchema),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    page: OrganizerDashboardOrderSummary[]
    isDone: boolean
    continueCursor: string
    splitCursor?: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, paginationOpts, ...input }) => {
      const op = "organizerDashboardOrderListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "bestellungen.sehen")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardOrderListFilterSchema, input)
      if (!filters.success) return createResultError(op, a.summarize(filters.issues))
      const { eventKey, status } = filters.output
      const search = (filters.output.search ?? "").toLowerCase()
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50)
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      if (eventKey) {
        const event = await organizerDashboardOrderEventScopeGet(ctx, orgId, eventKey, op)
        if (!event.success) return event
      }
      const scope = {
        kind: "orders" as const,
        userId: String(userId),
        orgId: String(orgId),
        eventKey: eventKey ?? null,
        status: status ?? null,
        search,
      }
      const cursor = organizerDashboardOrderCursorParse(scope, paginationOpts.cursor)
      if (!cursor.success) return cursor
      const end = organizerDashboardOrderCursorParse(scope, paginationOpts.endCursor ?? null)
      if (!end.success) return end
      const source = eventKey
        ? ctx.db
            .query("ticketOrders")
            .withIndex("orgIdAndEventKeyAndCreatedAt", (q) => q.eq("orgId", orgId).eq("eventKey", eventKey))
        : ctx.db.query("ticketOrders").withIndex("orgIdAndCreatedAt", (q) => q.eq("orgId", orgId))
      const result = await organizerDashboardOrderPageRead(() =>
        source.order("desc").paginate({
          cursor: cursor.data,
          endCursor: end.data,
          numItems: paginationOpts.numItems,
          maximumRowsRead: paginationOpts.numItems,
          maximumBytesRead: 512 * 1024,
        }),
      )
      if (!result.success) return result
      const indexed = result.data
      const page: OrganizerDashboardOrderSummary[] = []
      for (const order of indexed.page) {
        // Snapshots alone are insufficient: event ownership can have changed.
        const checked = await organizerDashboardOrderScopeGet(ctx, orgId, order._id, op)
        if (!checked.success) continue
        if (status && order.status !== status) continue
        const dto = organizerDashboardOrderSummaryCreate(order)
        const haystack =
          `${dto.bookingNumber ?? ""} ${dto.buyer.givenName} ${dto.buyer.familyName} ${dto.buyer.email} ${order.customerEmail} ${order.customerGivenName ?? ""} ${order.customerFamilyName ?? ""}`.toLowerCase()
        if (search && !haystack.includes(search)) continue
        page.push(dto)
      }
      return createResult({
        page,
        isDone: indexed.isDone,
        continueCursor: organizerDashboardOrderCursorCreate(scope, indexed.continueCursor),
        ...(indexed.splitCursor
          ? { splitCursor: organizerDashboardOrderCursorCreate(scope, indexed.splitCursor) }
          : {}),
      })
    }),
})
