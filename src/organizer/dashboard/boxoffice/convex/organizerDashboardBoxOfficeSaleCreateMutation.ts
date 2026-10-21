import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { organizerDashboardBoxOfficeSaleCreateSchema } from "../model/organizerDashboardBoxOfficeSaleCreateSchema.ts"
import { organizerDashboardBoxOfficeSaleTotalCompute } from "../model/organizerDashboardBoxOfficeSaleTotalCompute.ts"
import { organizerDashboardBoxOfficeTierGet } from "./organizerDashboardBoxOfficeTierGet.ts"

export type OrganizerDashboardBoxOfficeSaleRow = {
  readonly saleId: string
  readonly eventKey: string
  readonly tierKey: string
  readonly tierName: string
  readonly quantity: number
  readonly unitPriceCents: number
  readonly totalCents: number
  readonly buyerEmail: string | null
  readonly status: "wartet" | "bezahlt" | "abgebrochen"
  readonly testHarness: boolean
  readonly orderId: string | null
  readonly createdAt: string
  readonly paidAt: string | null
}

/** Projects a box-office sale without internal actor ids. */
export function organizerDashboardBoxOfficeSaleRowCreate(sale: {
  readonly _id: unknown
  readonly eventKey: string
  readonly tierKey: string
  readonly tierName: string
  readonly quantity: number
  readonly unitPriceCents: number
  readonly totalCents: number
  readonly buyerEmail?: string
  readonly status: "wartet" | "bezahlt" | "abgebrochen"
  readonly testHarness: boolean
  readonly orderId?: unknown
  readonly createdAt: string
  readonly paidAt?: string
}): OrganizerDashboardBoxOfficeSaleRow {
  return {
    saleId: String(sale._id),
    eventKey: sale.eventKey,
    tierKey: sale.tierKey,
    tierName: sale.tierName,
    quantity: sale.quantity,
    unitPriceCents: sale.unitPriceCents,
    totalCents: sale.totalCents,
    buyerEmail: sale.buyerEmail ?? null,
    status: sale.status,
    testHarness: sale.testHarness,
    orderId: sale.orderId !== undefined ? String(sale.orderId) : null,
    createdAt: sale.createdAt,
    paidAt: sale.paidAt ?? null,
  }
}

/**
 * Creates a box-office sale (Kassenvorgang). Price and contingent are set by
 * the organizer (`abendkasse.preise`); the tier contingent is never exceeded.
 */
export const organizerDashboardBoxOfficeSaleCreateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    tierKey: v.string(),
    quantity: v.number(),
    unitPriceCents: v.optional(v.number()),
    buyerEmail: v.optional(v.string()),
    testHarness: v.optional(v.boolean()),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardBoxOfficeSaleRow> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) => {
      const op = "organizerDashboardBoxOfficeSaleCreateMutation"
      const auth = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "abendkasse.preise")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardBoxOfficeSaleCreateSchema, input)
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const { eventKey, tierKey, quantity, buyerEmail } = parsed.output
      const scoped = await organizerDashboardBoxOfficeTierGet(mutationCtx, orgId, eventKey, tierKey, op)
      if (!scoped.success) return scoped
      const { tier } = scoped.data
      const unitPriceCents = parsed.output.unitPriceCents ?? tier.priceCents
      // One paginate() per function only (Convex limit): bounded take() read.
      const existingSales = await mutationCtx.db
        .query("organizerDashboardBoxOfficeSales")
        .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
        .take(1000)
      let reserved = tier.sold
      for (const sale of existingSales) {
        if (sale.tierKey === tierKey && sale.status !== "abgebrochen") reserved += sale.quantity
      }
      if (reserved + quantity > tier.capacity) {
        return createResultError(op, `Kontingent erschöpft: noch ${Math.max(tier.capacity - reserved, 0)} frei`)
      }
      const now = new Date().toISOString()
      const saleId = await mutationCtx.db.insert("organizerDashboardBoxOfficeSales", {
        orgId,
        eventKey,
        tierKey,
        tierName: tier.name,
        quantity,
        unitPriceCents,
        totalCents: organizerDashboardBoxOfficeSaleTotalCompute({ quantity, unitPriceCents }),
        ...(buyerEmail !== undefined ? { buyerEmail } : {}),
        status: "wartet",
        testHarness: parsed.output.testHarness === true,
        createdAt: now,
        createdByUserId: String(userId),
      })
      const sale = await mutationCtx.db.get("organizerDashboardBoxOfficeSales", saleId)
      if (!sale) return createResultError(op, "Sale disappeared")
      return createResult(organizerDashboardBoxOfficeSaleRowCreate(sale))
    }),
})
