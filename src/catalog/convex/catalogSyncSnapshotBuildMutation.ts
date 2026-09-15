import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { catalogSyncLimits } from "./catalogSyncLimits.js"
import { catalogSyncSnapshotPayloadBytesCalculate } from "./catalogSyncSnapshotPayloadBytesCalculate.js"

type SnapshotBuildResult =
  | { status: "stale"; currentVersion: number }
  | { status: "building"; eventCount: number; chunkCount: number; payloadBytes: number }
  | { status: "ready"; eventCount: number; chunkCount: number; payloadBytes: number }

export const catalogSyncSnapshotBuildMutation = internalMutation({
  args: { requestedVersion: v.number() },
  handler: async (ctx, args): PromiseResult<SnapshotBuildResult> => {
    const op = "catalogSyncSnapshotBuildMutation"
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state) return createResultError(op, "Catalog sync state is missing")
    if (state.version !== args.requestedVersion) return createResult({ status: "stale", currentVersion: state.version })

    let snapshot = await ctx.db
      .query("catalogSyncSnapshots")
      .withIndex("version", (q) => q.eq("version", args.requestedVersion))
      .unique()
    if (!snapshot) {
      const now = new Date().toISOString()
      const snapshotId = await ctx.db.insert("catalogSyncSnapshots", {
        version: args.requestedVersion,
        status: "building",
        eventCursor: undefined,
        nextChunkIndex: 0,
        eventCount: 0,
        chunkCount: 0,
        payloadBytes: catalogSyncSnapshotPayloadBytesCalculate(args.requestedVersion, 0, 0),
        updatedAt: now,
      })
      snapshot = await ctx.db.get("catalogSyncSnapshots", snapshotId)
      if (!snapshot) return createResultError(op, "Catalog snapshot could not be initialized")
    }
    if (snapshot.status === "ready")
      return createResult({
        status: "ready",
        eventCount: snapshot.eventCount,
        chunkCount: snapshot.chunkCount,
        payloadBytes: snapshot.payloadBytes,
      })

    const eventPage = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey")
      .order("asc")
      .paginate({
        cursor: snapshot.eventCursor ?? null,
        numItems: catalogSyncLimits.buildEventsPerBatch,
        maximumRowsRead: catalogSyncLimits.buildEventsPerBatch,
        maximumBytesRead: catalogSyncLimits.buildEventsPerBatch * catalogSyncLimits.snapshotChunkMaxBytes,
      })
    const nextEventCount = snapshot.eventCount + eventPage.page.length
    if (nextEventCount > catalogSyncLimits.billingMaxEvents)
      return createResultError(op, `Catalog exceeds Billing's ${catalogSyncLimits.billingMaxEvents}-event limit`)

    for (const event of eventPage.page) {
      if (event.catalogVersion > args.requestedVersion)
        return createResultError(op, `Catalog event ${event.eventKey} is newer than requestedVersion`)
      const tierPage = await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id))
        .order("asc")
        .take(catalogSyncLimits.billingMaxTiersPerEvent + 1)
      if (tierPage.length > catalogSyncLimits.billingMaxTiersPerEvent)
        return createResultError(
          op,
          `Event ${event.eventKey} exceeds the bounded ${catalogSyncLimits.billingMaxTiersPerEvent}-tier limit`,
        )
      if (tierPage.some((tier) => tier.catalogVersion > args.requestedVersion))
        return createResultError(op, `Catalog tiers for ${event.eventKey} are newer than requestedVersion`)

      const payloadJson = JSON.stringify({
        eventKey: event.eventKey,
        title: event.title,
        subtitle: event.subtitle,
        description: event.description,
        category: event.category,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        doorsAt: event.doorsAt,
        venue: event.venue,
        city: event.city,
        address: event.address,
        organizer: event.organizer,
        imageUrl: event.imageUrl,
        imageAlt: event.imageAlt,
        tags: event.tags,
        status: event.status,
        catalogVersion: args.requestedVersion,
        tiers: tierPage.map((tier) => ({
          tierKey: tier.tierKey,
          name: tier.name,
          description: tier.description,
          priceCents: tier.priceCents,
          feeCents: tier.feeCents,
          capacity: tier.capacity,
          reserved: tier.reserved,
          sold: tier.sold,
          sortOrder: tier.sortOrder,
          catalogVersion: args.requestedVersion,
        })),
      })
      if (new TextEncoder().encode(payloadJson).byteLength > catalogSyncLimits.snapshotChunkMaxBytes)
        return createResultError(
          op,
          `Event ${event.eventKey} exceeds the bounded ${catalogSyncLimits.snapshotChunkMaxBytes}-byte snapshot chunk limit`,
        )

      const payloadBytes = new TextEncoder().encode(payloadJson).byteLength
      const nextPayloadBytes: number = snapshot.payloadBytes + payloadBytes + (snapshot.eventCount > 0 ? 1 : 0)
      if (nextPayloadBytes > catalogSyncLimits.billingPayloadMaxBytes - catalogSyncLimits.billingEnvelopeReserveBytes)
        return createResultError(
          op,
          `Catalog snapshot exceeds the bounded ${catalogSyncLimits.billingPayloadMaxBytes}-byte Billing payload limit`,
        )

      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version: args.requestedVersion,
        chunkIndex: snapshot.nextChunkIndex,
        eventKey: event.eventKey,
        payloadJson,
      })
      snapshot = {
        ...snapshot,
        nextChunkIndex: snapshot.nextChunkIndex + 1,
        eventCount: snapshot.eventCount + 1,
        chunkCount: snapshot.chunkCount + 1,
        payloadBytes: nextPayloadBytes,
      }
    }

    const isDone = eventPage.isDone
    const updatedAt = new Date().toISOString()
    await ctx.db.patch("catalogSyncSnapshots", snapshot._id, {
      status: isDone ? "ready" : "building",
      eventCursor: isDone ? undefined : eventPage.continueCursor,
      nextChunkIndex: snapshot.nextChunkIndex,
      eventCount: snapshot.eventCount,
      chunkCount: snapshot.chunkCount,
      payloadBytes: snapshot.payloadBytes,
      updatedAt,
    })

    return createResult({
      status: isDone ? "ready" : "building",
      eventCount: snapshot.eventCount,
      chunkCount: snapshot.chunkCount,
      payloadBytes: snapshot.payloadBytes,
    })
  },
})
