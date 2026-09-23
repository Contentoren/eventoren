import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

export const catalogImageStageClaimMutation = internalMutation({
  args: { token: v.string(), stageId: v.id("catalogImageStages"), storageId: v.id("_storage") },
  handler: (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, stageId, storageId }) => {
      const op = "catalogImageStageClaimMutation"
      const authorized = await catalogAdminAuthorizeFn(ctx, userId)
      if (!authorized.success) return authorized
      const stage = await ctx.db.get("catalogImageStages", stageId)
      if (
        !stage ||
        stage.ownerId !== userId ||
        stage.storageId !== storageId ||
        stage.status !== "registered" ||
        stage.expiresAt <= Date.now()
      )
        return createResultError(op, "Image upload has expired, was already used, or is not yours")
      const metadata = await ctx.db.system.get("_storage", storageId)
      if (
        !metadata ||
        metadata.size !== stage.byteSize ||
        (metadata.contentType && metadata.contentType !== stage.mediaType)
      )
        return createResultError(op, "Uploaded image type or size does not match")
      await ctx.db.patch("catalogImageStages", stageId, { status: "processing" })
      return createResult({ filename: stage.filename, mediaType: stage.mediaType, byteSize: stage.byteSize })
    }),
})
