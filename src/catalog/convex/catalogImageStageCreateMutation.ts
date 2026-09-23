import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogImageValidate } from "./catalogImageValidate.js"

export const catalogImageStageCreateMutation = internalMutation({
  args: {
    token: v.string(),
    filename: v.string(),
    mediaType: v.string(),
    byteSize: v.number(),
    storageId: v.id("_storage"),
  },
  handler: (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, ...input }) => {
      const op = "catalogImageStageCreateMutation"
      const authorized = await catalogAdminAuthorizeFn(ctx, userId)
      if (!authorized.success) return authorized
      const valid = catalogImageValidate(input.filename, input.mediaType, input.byteSize)
      if (!valid.success) return valid
      const metadata = await ctx.db.system.get("_storage", input.storageId)
      if (
        !metadata ||
        metadata.size !== input.byteSize ||
        (metadata.contentType && metadata.contentType !== input.mediaType)
      )
        return createResultError(op, "Uploaded image type or size does not match")
      const registered = await ctx.db
        .query("catalogImageStages")
        .withIndex("storageId", (q) => q.eq("storageId", input.storageId))
        .first()
      if (registered) return createResultError(op, "Uploaded image has already been registered")
      const expiresAt = Date.now() + 60 * 60 * 1000
      const stageId = await ctx.db.insert("catalogImageStages", {
        ownerId: userId,
        ...input,
        status: "registered",
        expiresAt,
      })
      await ctx.scheduler.runAt(expiresAt, internal.catalog.catalogImageStageExpireMutation, { stageId })
      console.info("Event image stage created", { stageId })
      return createResult({ stageId })
    }),
})
