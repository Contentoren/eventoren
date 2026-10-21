import { defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * Box-office sales (Kassenvorgänge). The Kassenmodus creates them, the guest
 * purchase page pays them. `testHarness` marks explicit demo-harness sales;
 * only those accept the simulated device payment. Real sales complete solely
 * by linking an already-paid canonical order — paid states are never faked.
 */
export const organizerDashboardBoxOfficeTables = {
  organizerDashboardBoxOfficeSales: defineTable({
    orgId: v.id("orgs"),
    eventKey: v.string(),
    tierKey: v.string(),
    tierName: v.string(),
    quantity: v.number(),
    unitPriceCents: v.number(),
    totalCents: v.number(),
    buyerEmail: v.optional(v.string()),
    status: v.union(v.literal("wartet"), v.literal("bezahlt"), v.literal("abgebrochen")),
    testHarness: v.boolean(),
    orderId: v.optional(v.id("ticketOrders")),
    createdAt: v.string(),
    paidAt: v.optional(v.string()),
    createdByUserId: v.optional(v.string()),
  })
    .index("eventKeyAndCreatedAt", ["eventKey", "createdAt"])
    .index("orgIdAndCreatedAt", ["orgId", "createdAt"]),
} as const
