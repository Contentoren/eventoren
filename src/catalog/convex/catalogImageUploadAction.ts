import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalAction } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { EventImageVariants } from "#src/events/EventImageVariants.ts"
import { catalogImageForward } from "./catalogImageForward.js"
import { catalogImageBytesValidate } from "./catalogImageBytesValidate.js"
import { catalogImageMaxBytes } from "./catalogImageMaxBytes.js"

export const catalogImageUploadAction = internalAction({
  args: { token: v.string(), stageId: v.id("catalogImageStages"), storageId: v.id("_storage") },
  handler: async (ctx, args): PromiseResult<EventImageVariants> => {
    const op = "catalogImageUploadAction"
    const claimed = await ctx.runMutation(internal.catalog.catalogImageStageClaimMutation, args)
    if (!claimed.success) return claimed
    console.info("Event image forwarding started", { stageId: args.stageId })
    try {
      const blob = await ctx.storage.get(args.storageId)
      if (
        !blob ||
        blob.size !== claimed.data.byteSize ||
        blob.size > catalogImageMaxBytes ||
        (blob.type && blob.type !== claimed.data.mediaType)
      )
        return createResultError(op, "Staged image type or size did not match")
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const valid = catalogImageBytesValidate(bytes, claimed.data.mediaType)
      if (!valid.success) return valid
      const forwarded = await catalogImageForward({
        bytes,
        filename: claimed.data.filename,
        mediaType: claimed.data.mediaType,
        stageId: args.stageId,
      })
      if (forwarded.success)
        console.info("Event image published", { stageId: args.stageId, assetId: forwarded.data.assetId })
      return forwarded
    } catch {
      console.error("Event image forwarding failed", { stageId: args.stageId })
      return createResultError(op, "Event image could not be processed; retry with a new upload")
    } finally {
      try {
        await ctx.runMutation(internal.catalog.catalogImageStageExpireMutation, { stageId: args.stageId, force: true })
      } catch {
        // The scheduled expiry is a second chance if immediate cleanup is temporarily unavailable.
        console.error("Event image stage cleanup deferred", { stageId: args.stageId })
      }
    }
  },
})
