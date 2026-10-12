import { v } from "convex/values"
import type { Doc } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogE2eLegacyReadinessEventKey } from "./catalogE2eLegacyReadinessCheck.js"
import { catalogE2eLegacyTechnicalCheckoutEventKey } from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import {
  catalogE2eLegacyTechnicalGraphProve,
  type CatalogE2eLegacyTechnicalKind,
} from "./catalogE2eLegacyTechnicalGraphProve.js"
import { catalogE2eOwnedEventCheck } from "./catalogE2eOwnedEventCheck.js"
import { catalogE2eOwnedGraphDelete } from "./catalogE2eOwnedGraphDelete.js"
import { catalogE2eOwnedGraphProve } from "./catalogE2eOwnedGraphProve.js"
import { catalogE2eRunMarkerExtract } from "./catalogE2eRunMarkerExtract.js"

const defaultStaleAfterMs = 24 * 60 * 60_000
const eventPageSize = 100
const nativeAuthOrphanKeyPattern =
  /^native-auth-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const nativeAuthOrphanUuidPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

const argsValidator = v.object({
  token: v.string(),
  staleAfterMs: v.optional(v.number()),
  cursor: v.optional(v.string()),
})

export type CatalogE2eHistoricalCleanupResult = {
  scannedEvents: number
  isDone: boolean
  continueCursor: string | null
  truncated?: boolean
  cleaned: {
    eventKey: string
    runId: string
    kind: "ticket-e2e" | CatalogE2eLegacyTechnicalKind
    product: "absent" | "deleted"
    deletedOrders: number
    deletedTickets: number
    deletedCheckInHistory: number
    deletedScannerLinks: number
    prunedScannerLinks: number
    paidHistory: "deleted" | "none"
  }[]
  skipped: { eventKey: string; reason: string }[]
  orphanScannerLinksDeleted: number
  orphanScannerLinksPruned: number
  scannedSnapshots: number
  cleanedSnapshotVersions: {
    version: number
    kinds: string[]
    eventKeys: string[]
    chunkCount: number
    action: "deleted" | "rebuilt"
  }[]
  deletedSnapshotChunks: number
  skippedSnapshotVersions: { version: number; reason: string }[]
  snapshotCleanup: "deferred-to-paged-snapshot-collector"
  externalArtifacts: "stripe-imap-pdf-reconciled-separately"
}

/**
 * Authenticated historical sweep of identifiable E2E fixtures without any local
 * checkpoint. Stale marker-proven ticket-e2e events (including already-archived
 * legacy fixtures left behind by archive-only cleanup) are fully deleted with
 * their owned graph, and approved legacy technical fixtures (native-auth run
 * events including archived rows, the synchronization-only readiness draft, and
 * the explicitly fictitious technical-checkout event) are swept regardless of
 * age. Each call processes one event page; the caller drains with
 * continueCursor until isDone. Derived catalog sync snapshots/chunks are never
 * touched here: the standalone paged snapshot discovery/cleanup APIs are the
 * sole authoritative global collector (the old per-page bounded global sweep
 * truncated beyond 1,000 genuine versions and double-counted the active
 * version). Ambiguous, foreign, live-provider (outside the exact approved
 * technical-checkout key) or unbounded fixtures are skipped with reasons, never
 * deleted. Scanner links that reference exactly an owned fixture key are
 * deleted (exclusive) or pruned (mixed); shared users and files are never
 * touched. Stripe financial history is never refunded or deleted.
 */
export const catalogE2eHistoricalCleanupMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogE2eHistoricalCleanupAuthorized),
})

async function catalogE2eHistoricalCleanupAuthorized(
  ctx: MutationCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eHistoricalCleanupResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const staleAfterMs =
    args.staleAfterMs === undefined || !Number.isFinite(args.staleAfterMs) || args.staleAfterMs < 0
      ? defaultStaleAfterMs
      : args.staleAfterMs
  const batch = await ctx.db.query("catalogEvents").paginate({ cursor: args.cursor ?? null, numItems: eventPageSize })
  const now = Date.now()
  const cleaned: CatalogE2eHistoricalCleanupResult["cleaned"] = []
  const skipped: CatalogE2eHistoricalCleanupResult["skipped"] = []
  for (const event of batch.page) {
    const legacyKind = catalogE2eHistoricalLegacyKindFor(event)
    if (!legacyKind) {
      const owned = catalogE2eOwnedEventCheck({
        eventKey: event.eventKey,
        title: event.title,
        organizer: event.organizer,
      })
      if (!owned.success) continue
      if (now - event._creationTime < staleAfterMs) continue
      const proven = await catalogE2eOwnedGraphProve(ctx, {
        event,
        earliestOrderCreationTime: event._creationTime,
      })
      if (!proven.success) {
        skipped.push({ eventKey: event.eventKey, reason: proven.errorMessage })
        continue
      }
      const deleted = await catalogE2eOwnedGraphDelete(ctx, args.userId, proven.data)
      if (!deleted.success) {
        skipped.push({ eventKey: event.eventKey, reason: deleted.errorMessage })
        continue
      }
      cleaned.push({
        eventKey: event.eventKey,
        runId: proven.data.runId,
        kind: "ticket-e2e",
        product: proven.data.tier ? "deleted" : "absent",
        deletedOrders: deleted.data.deletedOrders,
        deletedTickets: deleted.data.deletedTickets,
        deletedCheckInHistory: deleted.data.deletedCheckInHistory,
        deletedScannerLinks: deleted.data.deletedScannerLinks,
        prunedScannerLinks: deleted.data.prunedScannerLinks,
        paidHistory: deleted.data.paidHistory,
      })
      continue
    }
    const proven = await catalogE2eLegacyTechnicalGraphProve(ctx, { event, kind: legacyKind })
    if (!proven.success) {
      skipped.push({ eventKey: event.eventKey, reason: proven.errorMessage })
      continue
    }
    const deleted = await catalogE2eOwnedGraphDelete(ctx, args.userId, proven.data)
    if (!deleted.success) {
      skipped.push({ eventKey: event.eventKey, reason: deleted.errorMessage })
      continue
    }
    cleaned.push({
      eventKey: event.eventKey,
      runId: proven.data.runId,
      kind: legacyKind,
      product: proven.data.tier ? "deleted" : "absent",
      deletedOrders: deleted.data.deletedOrders,
      deletedTickets: deleted.data.deletedTickets,
      deletedCheckInHistory: deleted.data.deletedCheckInHistory,
      deletedScannerLinks: deleted.data.deletedScannerLinks,
      prunedScannerLinks: deleted.data.prunedScannerLinks,
      paidHistory: deleted.data.paidHistory,
    })
  }
  const orphans = await catalogE2eHistoricalOrphanScannerLinkSweep(ctx)
  if (!orphans.success) {
    skipped.push({ eventKey: "scanner-links", reason: orphans.errorMessage })
    return createResult({
      scannedEvents: batch.page.length,
      isDone: batch.isDone,
      continueCursor: batch.continueCursor,
      cleaned,
      skipped,
      orphanScannerLinksDeleted: 0,
      orphanScannerLinksPruned: 0,
      scannedSnapshots: 0,
      cleanedSnapshotVersions: [],
      deletedSnapshotChunks: 0,
      skippedSnapshotVersions: [],
      snapshotCleanup: "deferred-to-paged-snapshot-collector" as const,
      truncated: true,
      externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
    })
  }
  if (cleaned.length + skipped.length + orphans.data.deleted + orphans.data.pruned > 0)
    console.info("E2E historical fixture page swept", {
      scannedEvents: batch.page.length,
      cleaned: cleaned.length,
      skipped: skipped.length,
      orphanScannerLinksDeleted: orphans.data.deleted,
      orphanScannerLinksPruned: orphans.data.pruned,
      snapshotCleanup: "deferred-to-paged-snapshot-collector",
      isDone: batch.isDone,
    })
  return createResult({
    scannedEvents: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    cleaned,
    skipped,
    orphanScannerLinksDeleted: orphans.data.deleted,
    orphanScannerLinksPruned: orphans.data.pruned,
    scannedSnapshots: 0,
    cleanedSnapshotVersions: [],
    deletedSnapshotChunks: 0,
    skippedSnapshotVersions: [],
    snapshotCleanup: "deferred-to-paged-snapshot-collector" as const,
    externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
  })
}

/**
 * Route an event to its approved legacy technical kind by exact key shape. Key
 * shape alone only routes; ownership is proven later from corroborating stored
 * markers (title agreement, technical sync description/image, or explicitly
 * fictitious description with structurally linked tiers). Returns null for non-legacy events.
 */
function catalogE2eHistoricalLegacyKindFor(event: Doc<"catalogEvents">): CatalogE2eLegacyTechnicalKind | null {
  if (event.eventKey === catalogE2eLegacyTechnicalCheckoutEventKey) return "technical-checkout"
  if (event.eventKey === catalogE2eLegacyReadinessEventKey) return "readiness"
  if (event.eventKey.startsWith("native-auth-")) return "native-auth"
  return null
}

/**
 * Delete or prune scanner links whose fixture event rows are already gone.
 * Only exact fixture-shaped keys (valid ticket-e2e run markers, native-auth
 * attempt keys including historical single-marker run keys that carry a UUID,
 * or the two exact legacy keys) whose events are absent qualify; links that
 * also reference other events keep those keys. Presence is checked per
 * distinct key so genuine events are never affected. Unbounded link tables
 * fail explicitly with truncation instead of silently reporting no-op success.
 */
async function catalogE2eHistoricalOrphanScannerLinkSweep(
  ctx: MutationCtx,
): Promise<PromiseResult<{ deleted: number; pruned: number }>> {
  const op = "catalogE2eHistoricalOrphanScannerLinkSweep"
  const links = await ctx.db.query("scannerLinks").take(101)
  if (links.length >= 101)
    return createResultError(op, "Scanner link sweep truncated at the bounded limit; checkpoint retained")
  const presence = new Map<string, boolean>()
  async function eventAbsent(eventKey: string): Promise<boolean> {
    const known = presence.get(eventKey)
    if (known !== undefined) return !known
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    presence.set(eventKey, event !== null)
    return event === null
  }
  function fixtureShapedKey(eventKey: string): boolean {
    if (eventKey === catalogE2eLegacyReadinessEventKey) return true
    if (eventKey === catalogE2eLegacyTechnicalCheckoutEventKey) return true
    if (nativeAuthOrphanKeyPattern.test(eventKey)) return true
    if (eventKey.startsWith("native-auth-") && nativeAuthOrphanUuidPattern.test(eventKey)) return true
    return catalogE2eRunMarkerExtract(eventKey).success
  }
  let deleted = 0
  let pruned = 0
  for (const link of links) {
    const fixtureKeys = link.eventKeys.filter((key) => fixtureShapedKey(key))
    if (fixtureKeys.length === 0) continue
    const absentKeys: string[] = []
    for (const key of fixtureKeys) if (await eventAbsent(key)) absentKeys.push(key)
    if (absentKeys.length === 0) continue
    if (absentKeys.length === link.eventKeys.length) {
      await ctx.db.delete("scannerLinks", link._id)
      deleted += 1
      continue
    }
    await ctx.db.patch("scannerLinks", link._id, {
      eventKeys: link.eventKeys.filter((key) => !absentKeys.includes(key)),
    })
    pruned += 1
  }
  return createResult({ deleted, pruned })
}
