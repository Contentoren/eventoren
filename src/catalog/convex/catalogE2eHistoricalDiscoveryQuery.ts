import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogE2eLegacyReadinessEventKey } from "./catalogE2eLegacyReadinessCheck.js"
import { catalogE2eLegacyTechnicalCheckoutEventKey } from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import { catalogE2eRunMarkerExtract } from "./catalogE2eRunMarkerExtract.js"

const eventPageSize = 100
const nativeAuthKeyPattern = /^native-auth-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const nativeAuthUuidPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

const argsValidator = v.object({
  token: v.string(),
  cursor: v.optional(v.string()),
})

export type CatalogE2eHistoricalDiscoveryResult = {
  scannedEvents: number
  isDone: boolean
  continueCursor: string | null
  candidates: {
    eventKey: string
    runId: string
    kind: "ticket-e2e" | "native-auth" | "readiness" | "technical-checkout"
  }[]
}

/**
 * Read-only pre-deletion inventory of fixture-shaped historical candidates.
 * Persist the drained inventory to the cleanup ledger BEFORE any deletion
 * mutation so a lost mutation response cannot orphan provider evidence: the
 * provider scans reuse this inventory even when the deletion receipt is lost.
 * Shape-only routing is intentionally permissive (exact keys and valid marker
 * shapes, including historical single-marker native-auth keys that carry the
 * run plus a UUID); ownership proof stays with the deletion mutation and the
 * provider reconcilers, never with this inventory.
 */
export const catalogE2eHistoricalDiscoveryQuery = query({
  args: argsValidator,
  handler: async (ctx, args) => authQueryTokenToUserId(ctx, args, catalogE2eHistoricalDiscoveryAuthorized),
})

async function catalogE2eHistoricalDiscoveryAuthorized(
  ctx: QueryCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eHistoricalDiscoveryResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const batch = await ctx.db.query("catalogEvents").paginate({ cursor: args.cursor ?? null, numItems: eventPageSize })
  const candidates: CatalogE2eHistoricalDiscoveryResult["candidates"] = []
  for (const event of batch.page) {
    if (event.eventKey === catalogE2eLegacyTechnicalCheckoutEventKey) {
      candidates.push({ eventKey: event.eventKey, runId: event.eventKey, kind: "technical-checkout" })
      continue
    }
    if (event.eventKey === catalogE2eLegacyReadinessEventKey) {
      candidates.push({ eventKey: event.eventKey, runId: event.eventKey, kind: "readiness" })
      continue
    }
    if (nativeAuthKeyPattern.test(event.eventKey)) {
      candidates.push({ eventKey: event.eventKey, runId: event.eventKey, kind: "native-auth" })
      continue
    }
    if (event.eventKey.startsWith("native-auth-") && nativeAuthUuidPattern.test(event.eventKey)) {
      candidates.push({ eventKey: event.eventKey, runId: event.eventKey, kind: "native-auth" })
      continue
    }
    const marker = catalogE2eRunMarkerExtract(event.eventKey)
    if (marker.success) candidates.push({ eventKey: event.eventKey, runId: marker.data, kind: "ticket-e2e" })
  }
  return createResult({
    scannedEvents: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    candidates,
  })
}
