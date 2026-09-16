import { v } from "convex/values"
import type { EventorenCatalogUpsertRequest } from "billing/contracts/eventorenCatalogUpsertRequestSchema"
import { internal } from "#convex/_generated/api.js"
import { internalAction } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { billingEventorenClient } from "#src/ticketing/convex/billingEventorenClient.ts"
import { catalogSyncLimits } from "./catalogSyncLimits.js"

export const catalogSyncPushAction = internalAction({
  args: { requestedVersion: v.number() },
  handler: async (ctx, args): PromiseResult<{ catalogVersion: number; replayed: boolean }> => {
    let firstPage = await ctx.runQuery(internal.catalog.catalogSyncSnapshotQuery, {
      requestedVersion: args.requestedVersion,
    })
    if (!firstPage) {
      const buildResult = await ctx.runMutation(internal.catalog.catalogSyncSnapshotBuildMutation, {
        requestedVersion: args.requestedVersion,
      })
      if (!buildResult.success) {
        await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
          attemptedVersion: args.requestedVersion,
          errorMessage: buildResult.errorMessage,
          retryable: false,
        })
        return buildResult
      }
      if (buildResult.data.status === "stale") {
        await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
          attemptedVersion: args.requestedVersion,
          errorMessage: "Catalog snapshot request is stale",
        })
        return createResultError("catalogSyncPushAction", "Catalog snapshot request is stale")
      }
      if (buildResult.data.status === "building") {
        await ctx.scheduler.runAfter(0, internal.catalog.catalogSyncPushAction, {
          requestedVersion: args.requestedVersion,
        })
        return createResultError("catalogSyncPushAction", "Catalog snapshot is still building")
      }
      firstPage = await ctx.runQuery(internal.catalog.catalogSyncSnapshotQuery, {
        requestedVersion: args.requestedVersion,
      })
    }
    if (!firstPage) return createResultError("catalogSyncPushAction", "Catalog snapshot is missing")
    if (firstPage.catalogVersion !== args.requestedVersion)
      return createResultError("catalogSyncPushAction", "Catalog snapshot version does not match requestedVersion")

    const config = billingEventorenClient.configRead()
    if (!config.success) {
      await ctx.runMutation(internal.catalog.catalogSyncRescheduleMutation, {
        attemptedVersion: args.requestedVersion,
        errorMessage: config.errorMessage,
      })
      return config
    }

    const billingPayloadEnvelopeBytes = new TextEncoder().encode(
      JSON.stringify({
        organizationId: config.data.organizationId,
        catalogVersion: firstPage.catalogVersion,
        events: [],
      }),
    ).byteLength
    const snapshotPayloadEnvelopeBytes = new TextEncoder().encode(
      JSON.stringify({ catalogVersion: firstPage.catalogVersion, events: [] }),
    ).byteLength
    const expectedPayloadBytes = firstPage.payloadBytes + billingPayloadEnvelopeBytes - snapshotPayloadEnvelopeBytes
    if (expectedPayloadBytes > catalogSyncLimits.billingPayloadMaxBytes)
      await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
        attemptedVersion: args.requestedVersion,
        errorMessage: "Catalog snapshot exceeds the bounded Billing payload limit",
        retryable: false,
      })
    if (expectedPayloadBytes > catalogSyncLimits.billingPayloadMaxBytes)
      return createResultError(
        "catalogSyncPushAction",
        `Catalog snapshot exceeds the bounded ${catalogSyncLimits.billingPayloadMaxBytes}-byte Billing payload limit`,
      )

    const events = [...firstPage.events]
    let cursor = firstPage.continueCursor
    let isDone = firstPage.isDone
    while (!isDone) {
      const page = await ctx.runQuery(internal.catalog.catalogSyncSnapshotQuery, {
        requestedVersion: args.requestedVersion,
        cursor,
      })
      if (!page) return createResultError("catalogSyncPushAction", "Catalog snapshot page is missing")
      if (page.requestedVersion !== args.requestedVersion || page.catalogVersion !== firstPage.catalogVersion)
        return createResultError("catalogSyncPushAction", "Catalog snapshot version changed during assembly")
      events.push(...page.events)
      cursor = page.continueCursor
      isDone = page.isDone
    }
    if (events.length !== firstPage.eventCount)
      return createResultError("catalogSyncPushAction", "Catalog snapshot event count changed during assembly")
    if (events.length > catalogSyncLimits.billingMaxEvents)
      return createResultError("catalogSyncPushAction", "Catalog snapshot exceeds Billing's event limit")

    const billingPayload = {
      organizationId: config.data.organizationId,
      catalogVersion: args.requestedVersion,
      events: events as EventorenCatalogUpsertRequest["events"],
    } satisfies EventorenCatalogUpsertRequest
    const serializedBillingPayload = JSON.stringify(billingPayload)
    const serializedBillingPayloadBytes = new TextEncoder().encode(serializedBillingPayload).byteLength
    if (serializedBillingPayloadBytes > catalogSyncLimits.billingPayloadMaxBytes)
      await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
        attemptedVersion: args.requestedVersion,
        errorMessage: "Catalog snapshot exceeds the bounded Billing payload limit",
        retryable: false,
      })
    if (serializedBillingPayloadBytes > catalogSyncLimits.billingPayloadMaxBytes)
      return createResultError(
        "catalogSyncPushAction",
        `Catalog snapshot exceeds the bounded ${catalogSyncLimits.billingPayloadMaxBytes}-byte Billing payload limit`,
      )

    // Billing persists this one request atomically. Do not replace it with per-page writes.
    const pushResult = await billingEventorenClient.catalogPush(config.data, billingPayload)
    if (!pushResult.success) {
      await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
        attemptedVersion: args.requestedVersion,
        errorMessage: pushResult.errorMessage,
        retryable: billingRequestRetryableRead(pushResult.errorMessage),
      })
      return pushResult
    }
    if (pushResult.data.catalogVersion !== args.requestedVersion) {
      const correlationError = "Billing acknowledged a different catalog version"
      await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
        attemptedVersion: args.requestedVersion,
        errorMessage: correlationError,
        retryable: false,
      })
      return createResultError("catalogSyncPushAction", correlationError)
    }

    await ctx.runMutation(internal.catalog.catalogSyncMarkSyncedMutation, {
      attemptedVersion: args.requestedVersion,
      catalogDigest: pushResult.data.catalogDigest,
    })
    return createResult({ catalogVersion: pushResult.data.catalogVersion, replayed: pushResult.data.replayed })
  },
})

function billingRequestRetryableRead(errorMessage: string): boolean {
  const statusMatch = /^Billing request returned HTTP (\d{3})$/u.exec(errorMessage)
  if (!statusMatch) return true
  const status = Number(statusMatch[1])
  return status === 408 || status === 429 || status >= 500
}
