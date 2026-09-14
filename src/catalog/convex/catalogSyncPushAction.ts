import { internalAction } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { billingEventorenClient } from "#src/ticketing/convex/billingEventorenClient.ts"

export const catalogSyncPushAction = internalAction({
  args: { requestedVersion: v.number() },
  handler: async (ctx, args): PromiseResult<{ catalogVersion: number; replayed: boolean }> => {
    const snapshot = await ctx.runQuery(internal.catalog.catalogSyncSnapshotQuery, {
      requestedVersion: args.requestedVersion,
    })
    if (!snapshot) return createResultError("catalogSyncPushAction", "Catalog sync state is missing")

    const config = billingEventorenClient.configRead()
    if (!config.success) {
      await ctx.runMutation(internal.catalog.catalogSyncRescheduleMutation, {
        attemptedVersion: snapshot.catalogVersion,
        errorMessage: config.errorMessage,
      })
      return config
    }

    const pushResult = await billingEventorenClient.catalogPush(config.data, {
      organizationId: config.data.organizationId,
      catalogVersion: snapshot.catalogVersion,
      events: snapshot.events,
    })
    if (!pushResult.success) {
      await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
        attemptedVersion: snapshot.catalogVersion,
        errorMessage: pushResult.errorMessage,
      })
      return pushResult
    }
    if (pushResult.data.catalogVersion !== snapshot.catalogVersion) {
      const correlationError = "Billing acknowledged a different catalog version"
      await ctx.runMutation(internal.catalog.catalogSyncMarkFailedMutation, {
        attemptedVersion: snapshot.catalogVersion,
        errorMessage: correlationError,
      })
      return createResultError("catalogSyncPushAction", correlationError)
    }

    await ctx.runMutation(internal.catalog.catalogSyncMarkSyncedMutation, {
      attemptedVersion: snapshot.catalogVersion,
      catalogDigest: pushResult.data.catalogDigest,
    })
    return createResult({ catalogVersion: pushResult.data.catalogVersion, replayed: pushResult.data.replayed })
  },
})
