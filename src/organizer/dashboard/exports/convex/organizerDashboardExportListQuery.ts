import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import * as a from "valibot"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardFinanceEventScopeGet } from "#src/organizer/dashboard/finance/convex/organizerDashboardFinanceEventScopeGet.ts"
import type { OrganizerDashboardPermission } from "#src/organizer/dashboard/model/organizerDashboardPermissionSchema.ts"
import { organizerDashboardExportCursorCreate } from "#src/organizer/dashboard/exports/organizerDashboardExportCursorCreate.ts"
import { organizerDashboardExportCursorParse } from "#src/organizer/dashboard/exports/organizerDashboardExportCursorParse.ts"
import {
  organizerDashboardExportFilterSchema,
  type OrganizerDashboardExportKind,
} from "#src/organizer/dashboard/exports/organizerDashboardExportFilterSchema.ts"
import { organizerDashboardExportHeaderGet } from "#src/organizer/dashboard/exports/organizerDashboardExportRowsCreate.ts"

export type OrganizerDashboardExportRow =
  | {
      kind: "teilnehmer"
      name: string
      email: string
      tierName: string
      code: string
      cancelled: boolean
      checkedInAt?: string
    }
  | {
      kind: "bestellungen"
      bookingNumber: string
      buyerName: string
      buyerEmail: string
      status: string
      totalCents: number
      createdAt: string
    }
  | {
      kind: "checkins"
      ticketCode: string
      participantName: string
      action: string
      occurredAt: string
      entrance: string
      operatorName: string
    }

const permissionFor: Record<OrganizerDashboardExportKind, OrganizerDashboardPermission> = {
  teilnehmer: "bestellungen.sehen",
  bestellungen: "bestellungen.sehen",
  checkins: "einlass.nutzen",
}

/**
 * Permission-filtered export rows for one event. Teilnehmer and Bestellungen
 * need bestellungen.sehen, Check-ins need einlass.nutzen. Results paginate
 * with scope-bound opaque cursors; formatting (CSV/XLSX/PDF/ICS, Berlin
 * display) happens client-side with the shared pure helpers.
 */
export const organizerDashboardExportListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    kind: v.union(v.literal("teilnehmer"), v.literal("bestellungen"), v.literal("checkins")),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    header: string[]
    rows: OrganizerDashboardExportRow[]
    isDone: boolean
    continueCursor: string
    splitCursor?: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, kind, search, paginationOpts }) => {
      const op = "organizerDashboardExportListQuery"
      const filters = a.safeParse(organizerDashboardExportFilterSchema, {
        orgId: String(orgId),
        eventKey,
        kind,
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, permissionFor[filters.output.kind])
      if (!auth.success) return auth
      const scope = await organizerDashboardFinanceEventScopeGet(ctx, orgId, filters.output.eventKey, op)
      if (!scope.success) return scope
      const needle = (search ?? "").trim().toLowerCase()
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) {
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      }
      const cursorScope = {
        kind: "exports" as const,
        userId: String(userId),
        orgId: String(orgId),
        eventKey: filters.output.eventKey,
        list: filters.output.kind,
        search: needle,
      }
      const cursor = organizerDashboardExportCursorParse(cursorScope, paginationOpts.cursor)
      if (!cursor.success) return cursor
      const end = organizerDashboardExportCursorParse(cursorScope, paginationOpts.endCursor ?? null)
      if (!end.success) return end
      const list = filters.output.kind

      if (list === "checkins") {
        const source = ctx.db
          .query("ticketCheckInHistory")
          .withIndex("eventKeyAndOccurredAt", (q) => q.eq("eventKey", filters.output.eventKey))
        const page = await source.order("desc").paginate({
          cursor: cursor.data,
          endCursor: end.data,
          numItems: paginationOpts.numItems,
          maximumRowsRead: paginationOpts.numItems,
          maximumBytesRead: 512 * 1024,
        })
        const rows: OrganizerDashboardExportRow[] = []
        for (const entry of page.page) {
          const haystack = `${entry.ticketNumber} ${entry.participantName} ${entry.operatorName}`.toLowerCase()
          if (needle && !haystack.includes(needle)) continue
          rows.push({
            kind: "checkins",
            ticketCode: entry.ticketNumber,
            participantName: entry.participantName,
            action: entry.action,
            occurredAt: entry.occurredAt,
            entrance: entry.linkName ?? "",
            operatorName: entry.operatorName,
          })
        }
        return createResult({
          header: organizerDashboardExportHeaderGet(list),
          rows,
          isDone: page.isDone,
          continueCursor: organizerDashboardExportCursorCreate(cursorScope, page.continueCursor),
          ...(page.splitCursor
            ? { splitCursor: organizerDashboardExportCursorCreate(cursorScope, page.splitCursor) }
            : {}),
        })
      }

      if (list === "bestellungen") {
        const source = ctx.db
          .query("ticketOrders")
          .withIndex("orgIdAndEventKeyAndCreatedAt", (q) =>
            q.eq("orgId", orgId).eq("eventKey", filters.output.eventKey),
          )
        const page = await source.order("desc").paginate({
          cursor: cursor.data,
          endCursor: end.data,
          numItems: paginationOpts.numItems,
          maximumRowsRead: paginationOpts.numItems,
          maximumBytesRead: 512 * 1024,
        })
        const rows: OrganizerDashboardExportRow[] = []
        for (const order of page.page) {
          if (order.orgId !== orgId) continue
          const buyerName = `${order.customerGivenName ?? ""} ${order.customerFamilyName ?? ""}`.trim()
          const haystack = `${order.bookingReference ?? ""} ${buyerName} ${order.customerEmail}`.toLowerCase()
          if (needle && !haystack.includes(needle)) continue
          rows.push({
            kind: "bestellungen",
            bookingNumber:
              order.bookingReference ??
              (order.bookingNumber !== undefined ? `EV-${order.bookingNumber}` : order.checkoutKey),
            buyerName,
            buyerEmail: order.customerEmail,
            status: order.status,
            totalCents: order.totalCents,
            createdAt: order.createdAt,
          })
        }
        return createResult({
          header: organizerDashboardExportHeaderGet(list),
          rows,
          isDone: page.isDone,
          continueCursor: organizerDashboardExportCursorCreate(cursorScope, page.continueCursor),
          ...(page.splitCursor
            ? { splitCursor: organizerDashboardExportCursorCreate(cursorScope, page.splitCursor) }
            : {}),
        })
      }

      const source = ctx.db
        .query("ticketIssued")
        .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", filters.output.eventKey))
      const page = await source.order("asc").paginate({
        cursor: cursor.data,
        endCursor: end.data,
        numItems: paginationOpts.numItems,
        maximumRowsRead: paginationOpts.numItems,
        maximumBytesRead: 512 * 1024,
      })
      const rows: OrganizerDashboardExportRow[] = []
      for (const ticket of page.page) {
        const name = ticket.participantName ?? ""
        const haystack = `${name} ${ticket.participantEmail ?? ""} ${ticket.code} ${ticket.tierName}`.toLowerCase()
        if (needle && !haystack.includes(needle)) continue
        rows.push({
          kind: "teilnehmer",
          name,
          email: ticket.participantEmail ?? "",
          tierName: ticket.tierName,
          code: ticket.code,
          cancelled: ticket.cancelled === true,
          ...(ticket.checkedInAt !== undefined ? { checkedInAt: ticket.checkedInAt } : {}),
        })
      }
      return createResult({
        header: organizerDashboardExportHeaderGet(list),
        rows,
        isDone: page.isDone,
        continueCursor: organizerDashboardExportCursorCreate(cursorScope, page.continueCursor),
        ...(page.splitCursor
          ? { splitCursor: organizerDashboardExportCursorCreate(cursorScope, page.splitCursor) }
          : {}),
      })
    }),
})
