import { paginationOptsValidator } from "convex/server"
import * as a from "valibot"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { organizerDashboardOrderParticipantListFilterSchema } from "../model/organizerDashboardOrderParticipantListFilterSchema.ts"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardOrderCursorCreate } from "../model/organizerDashboardOrderCursorCreate.ts"
import { organizerDashboardOrderCursorParse } from "../model/organizerDashboardOrderCursorParse.ts"
import {
  organizerDashboardOrderParticipantCreate,
  type OrganizerDashboardOrderParticipant,
} from "../model/organizerDashboardOrderParticipantCreate.ts"
import { organizerDashboardOrderEventScopeGet } from "./organizerDashboardOrderEventScopeGet.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"
import { organizerDashboardOrderPageRead } from "./organizerDashboardOrderPageRead.ts"

export const organizerDashboardOrderParticipantListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    ...valibotObjectToConvexFields(organizerDashboardOrderParticipantListFilterSchema),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    page: OrganizerDashboardOrderParticipant[]
    isDone: boolean
    continueCursor: string
    splitCursor?: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, paginationOpts, search: input }) => {
      const op = "organizerDashboardOrderParticipantListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId)
      if (!auth.success) return auth
      if (!auth.data.permissions.includes("bestellungen.sehen") && !auth.data.permissions.includes("einlass.nutzen"))
        return createResultError(op, "Keine Berechtigung für diesen Bereich.")
      const parsed = a.safeParse(organizerDashboardOrderParticipantListFilterSchema, { eventKey, search: input })
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      // eventKey is a canonical key: do not silently trim it into another key.
      if (parsed.output.eventKey !== eventKey) return createResultError(op, "Ungültiger Eventschlüssel")
      const event = await organizerDashboardOrderEventScopeGet(ctx, orgId, eventKey, op)
      if (!event.success) return event
      const search = (parsed.output.search ?? "").toLowerCase()
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50)
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      const scope = {
        kind: "participants" as const,
        userId: String(userId),
        orgId: String(orgId),
        eventKey,
        status: null,
        search,
      }
      const cursor = organizerDashboardOrderCursorParse(scope, paginationOpts.cursor)
      if (!cursor.success) return cursor
      const end = organizerDashboardOrderCursorParse(scope, paginationOpts.endCursor ?? null)
      if (!end.success) return end
      const result = await organizerDashboardOrderPageRead(() =>
        ctx.db
          .query("ticketIssued")
          .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", eventKey))
          .paginate({
            cursor: cursor.data,
            endCursor: end.data,
            numItems: paginationOpts.numItems,
            maximumRowsRead: paginationOpts.numItems,
            maximumBytesRead: 512 * 1024,
          }),
      )
      if (!result.success) return result
      const indexed = result.data
      const page: OrganizerDashboardOrderParticipant[] = []
      for (const ticket of indexed.page) {
        const checked = await organizerDashboardOrderScopeGet(ctx, orgId, ticket.orderId, op)
        if (!checked.success || checked.data.order.eventKey !== eventKey) continue
        const dto = organizerDashboardOrderParticipantCreate(ticket)
        if (
          search &&
          !`${dto.participantName} ${dto.participantEmail} ${dto.sequence} ${dto.tierName}`
            .toLowerCase()
            .includes(search)
        )
          continue
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
