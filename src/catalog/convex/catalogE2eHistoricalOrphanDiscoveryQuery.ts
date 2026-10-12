import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogE2eLegacyTechnicalCheckoutEventKey } from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import { catalogE2eRunMarkerExtract } from "./catalogE2eRunMarkerExtract.js"

const orderPageSize = 100

const argsValidator = v.object({
  token: v.string(),
  cursor: v.optional(v.string()),
})

export type CatalogE2eHistoricalOrphanDiscoveryResult = {
  scannedOrders: number
  isDone: boolean
  continueCursor: string | null
  candidates: { eventKey: string; runId: string; kind: "ticket-e2e" | "technical-checkout" }[]
}

/**
 * Read-only pre-deletion inventory of orphaned E2E-marked orders whose catalog
 * event row is already gone. Covers stale ticket-e2e test orders and the exact
 * approved technical-checkout fixture (test and live provider modes; Stripe
 * history is never touched). Persist before any orphan-deletion mutation so a
 * lost mutation response cannot orphan provider evidence. Marker checks are
 * intentionally permissive; exact ownership proof stays with the deletion
 * mutation and the provider reconcilers.
 */
export const catalogE2eHistoricalOrphanDiscoveryQuery = query({
  args: argsValidator,
  handler: async (ctx, args) => authQueryTokenToUserId(ctx, args, catalogE2eHistoricalOrphanDiscoveryAuthorized),
})

async function catalogE2eHistoricalOrphanDiscoveryAuthorized(
  ctx: QueryCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eHistoricalOrphanDiscoveryResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const batch = await ctx.db.query("ticketOrders").paginate({ cursor: args.cursor ?? null, numItems: orderPageSize })
  const candidates: CatalogE2eHistoricalOrphanDiscoveryResult["candidates"] = []
  for (const order of batch.page) {
    if (order.eventKey === catalogE2eLegacyTechnicalCheckoutEventKey) {
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", order.eventKey))
        .unique()
      if (event) continue
      candidates.push({ eventKey: order.eventKey, runId: order.eventKey, kind: "technical-checkout" })
      continue
    }
    if (order.customerGivenName !== "E2E" || order.stripeMode !== "test") continue
    if (!order.customerFamilyName) continue
    const runId = catalogE2eRunMarkerExtract(`ticket-e2e-${order.customerFamilyName}`)
    if (!runId.success) continue
    if (order.eventKey !== `ticket-e2e-${runId.data}`) continue
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", order.eventKey))
      .unique()
    if (event) continue
    candidates.push({ eventKey: order.eventKey, runId: runId.data, kind: "ticket-e2e" })
  }
  return createResult({
    scannedOrders: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    candidates,
  })
}
