import * as a from "valibot"
import { v } from "convex/values"
import { mutation, query } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerTicketCheckInApply } from "#src/organizer/convex/organizerTicketCheckInApply.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { organizerDashboardBoxOfficeSaleTestPaySchema } from "../model/organizerDashboardBoxOfficeSaleTestPaySchema.ts"
import { organizerDashboardBoxOfficeSaleCompleteSchema } from "../model/organizerDashboardBoxOfficeSaleCompleteSchema.ts"
import {
  organizerDashboardBoxOfficeSaleRowCreate,
  type OrganizerDashboardBoxOfficeSaleRow,
} from "./organizerDashboardBoxOfficeSaleCreateMutation.ts"

export type OrganizerDashboardBoxOfficePublicSale = {
  readonly saleId: string
  readonly eventTitle: string
  readonly venue: string
  readonly city: string
  readonly startsAt: string
  readonly tierName: string
  readonly quantity: number
  readonly totalCents: number
  readonly status: "wartet" | "bezahlt" | "abgebrochen"
  readonly testHarness: boolean
}

/**
 * EXPLICIT DEMO-HARNESS ONLY — simulated device payment (Apple/Google Pay,
 * simuliert). Requires testHarness:true and a sale created with
 * testHarness:true. Real sales reject; this never produces a paid order.
 */
export const organizerDashboardBoxOfficeSaleTestPayMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), saleId: v.string(), testHarness: v.boolean() },
  handler: (ctx, args): PromiseResult<OrganizerDashboardBoxOfficeSaleRow> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardBoxOfficeSaleTestPayMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "abendkasse.nutzen")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardBoxOfficeSaleTestPaySchema, input)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const saleId = parsed.output.saleId as Id<"organizerDashboardBoxOfficeSales">
      const sale = await mutationCtx.db.get("organizerDashboardBoxOfficeSales", saleId)
      if (!sale || String(sale.orgId) !== String(orgId)) {
        return createResultError(op, "Kassenvorgang nicht gefunden")
      }
      if (sale.testHarness !== true) {
        return createResultError(op, "TEST-Harness abgelehnt: kein Test-Vorgang")
      }
      if (sale.status !== "wartet") return createResultError(op, "Vorgang ist nicht mehr wartend")
      const paidAt = new Date().toISOString()
      await mutationCtx.db.patch("organizerDashboardBoxOfficeSales", sale._id, {
        status: "bezahlt",
        paidAt,
      })
      const updated = await mutationCtx.db.get("organizerDashboardBoxOfficeSales", sale._id)
      if (!updated) return createResultError(op, "Sale disappeared")
      return createResult(organizerDashboardBoxOfficeSaleRowCreate(updated))
    }),
})

/**
 * REAL completion path: links an already-paid canonical order to a waiting
 * sale, then atomically checks in that order's tickets at the "Abendkasse"
 * entrance. Fails without a paid order — paid states are never simulated.
 */
export const organizerDashboardBoxOfficeSaleCompleteMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), saleId: v.string(), orderId: v.string() },
  handler: (ctx, args): PromiseResult<{ sale: OrganizerDashboardBoxOfficeSaleRow; checkedIn: number }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardBoxOfficeSaleCompleteMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "abendkasse.preise")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardBoxOfficeSaleCompleteSchema, input)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const sale = await mutationCtx.db.get(
        "organizerDashboardBoxOfficeSales",
        parsed.output.saleId as Id<"organizerDashboardBoxOfficeSales">,
      )
      if (!sale || String(sale.orgId) !== String(orgId)) {
        return createResultError(op, "Kassenvorgang nicht gefunden")
      }
      if (sale.status !== "wartet") return createResultError(op, "Vorgang ist nicht mehr wartend")
      const order = await mutationCtx.db.get("ticketOrders", parsed.output.orderId as Id<"ticketOrders">)
      if (!order || order.eventKey !== sale.eventKey) {
        return createResultError(op, "Bestellung passt nicht zu diesem Vorgang")
      }
      if (order.status !== "paid" || order.paymentStatus !== "paid") {
        return createResultError(op, "Bestellung ist nicht bezahlt — kein simulierter Abschluss")
      }
      const user = await mutationCtx.db.get("users", userId)
      if (!user) return createResultError(op, "User not found")
      const event = await mutationCtx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", sale.eventKey))
        .unique()
      if (!event) return createResultError(op, "Veranstaltung nicht verfügbar")
      const tickets = await mutationCtx.db
        .query("ticketIssued")
        .withIndex("orderIdAndSequence", (q) => q.eq("orderId", order._id))
        .take(55)
      let checkedIn = 0
      const at = new Date().toISOString()
      for (const ticket of tickets.slice(0, 50)) {
        if (ticket.eventKey !== sale.eventKey || ticket.cancelled === true) continue
        if (ticket.checkedInAt !== undefined) continue
        const applied = await organizerTicketCheckInApply(mutationCtx, { event, ticket, order }, { user }, op)
        if (!applied.success) continue
        checkedIn += 1
        await mutationCtx.db.insert("organizerDashboardAdmissionScans", {
          orgId,
          eventKey: sale.eventKey,
          ticketId: ticket._id,
          ticketCode: ticket.code,
          entrance: "Abendkasse",
          action: "checkin",
          result: "ok",
          actorUserId: String(userId),
          at,
        })
      }
      await mutationCtx.db.patch("organizerDashboardBoxOfficeSales", sale._id, {
        status: "bezahlt",
        paidAt: at,
        orderId: order._id,
      })
      const updated = await mutationCtx.db.get("organizerDashboardBoxOfficeSales", sale._id)
      if (!updated) return createResultError(op, "Sale disappeared")
      return createResult({ sale: organizerDashboardBoxOfficeSaleRowCreate(updated), checkedIn })
    }),
})

/**
 * EXPLICIT DEMO-HARNESS, PUBLIC: simulated device payment from the guest
 * phone. No token, no organizer rights — the ONLY authorization is the sale's
 * own testHarness:true opt-in (set solely by `abendkasse.preise` holders).
 * Real sales always reject; no paid order is created; every projection keeps
 * testHarness:true so this bezahlt state is never mistaken for revenue.
 */
export const organizerDashboardBoxOfficeSaleTestDevicePayMutation = mutation({
  args: { saleId: v.id("organizerDashboardBoxOfficeSales"), testHarness: v.literal(true) },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardBoxOfficeSaleRow> => {
    const op = "organizerDashboardBoxOfficeSaleTestDevicePayMutation"
    const sale = await ctx.db.get("organizerDashboardBoxOfficeSales", args.saleId)
    if (!sale || String(sale.orgId) === "" || sale.testHarness !== true) {
      return createResultError(op, "TEST-Harness abgelehnt: kein Test-Vorgang")
    }
    if (sale.status !== "wartet") return createResultError(op, "Vorgang ist nicht mehr wartend")
    const paidAt = new Date().toISOString()
    await ctx.db.patch("organizerDashboardBoxOfficeSales", sale._id, { status: "bezahlt", paidAt })
    const updated = await ctx.db.get("organizerDashboardBoxOfficeSales", sale._id)
    if (!updated) return createResultError(op, "Sale disappeared")
    return createResult(organizerDashboardBoxOfficeSaleRowCreate(updated))
  },
})

/**
 * Public guest lookup for the mobile purchase page. No token: only public
 * event/tier/amount fields of waiting or paid sales, never buyer data.
 * Accepts an ignored optional token so the web live-query helper (which always
 * sends the session token when present) can subscribe anonymously or logged in.
 */
export const organizerDashboardBoxOfficeSalePublicGetQuery = query({
  args: { saleId: v.id("organizerDashboardBoxOfficeSales"), token: v.optional(v.string()) },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardBoxOfficePublicSale> => {
    const op = "organizerDashboardBoxOfficeSalePublicGetQuery"
    const sale = await ctx.db.get("organizerDashboardBoxOfficeSales", args.saleId)
    if (!sale || sale.status === "abgebrochen") {
      return createResultError(op, "Kassenvorgang nicht gefunden")
    }
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", sale.eventKey))
      .unique()
    if (!event) return createResultError(op, "Kassenvorgang nicht gefunden")
    return createResult({
      saleId: String(sale._id),
      eventTitle: event.title,
      venue: event.venue,
      city: event.city,
      startsAt: event.startsAt,
      tierName: sale.tierName,
      quantity: sale.quantity,
      totalCents: sale.totalCents,
      status: sale.status,
      testHarness: sale.testHarness,
    })
  },
})
