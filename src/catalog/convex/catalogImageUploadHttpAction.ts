import { httpAction } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResultError } from "#result"
import { catalogImageMaxBytes } from "./catalogImageMaxBytes.js"
import { catalogImageValidate } from "./catalogImageValidate.js"

/** Only this HTTP action can bind a freshly stored blob to a stage. No storage ID is accepted from clients. */
export const catalogImageUploadHttpAction = httpAction(async (ctx, request) => {
  const op = "catalogImageUploadHttpAction"
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return Response.json(createResultError(op, "Anmeldung erforderlich"), { status: 401 })
  const filename = request.headers.get("x-image-filename") ?? ""
  const mediaType = request.headers.get("content-type") ?? ""
  const length = Number(request.headers.get("x-image-size"))
  if (!Number.isSafeInteger(length) || length < 1 || length > catalogImageMaxBytes)
    return Response.json(createResultError(op, "Image must be between 1 byte and 10 MiB"), { status: 400 })
  const valid = catalogImageValidate(filename, mediaType, length)
  if (!valid.success) return Response.json(valid, { status: 400 })

  let storageId: Id<"_storage"> | undefined
  let stageId: Id<"catalogImageStages"> | undefined
  try {
    const blob = await request.blob()
    if (blob.size !== length || blob.size > catalogImageMaxBytes)
      return Response.json(createResultError(op, "Uploaded image size does not match"), { status: 400 })
    storageId = await ctx.storage.store(new Blob([blob], { type: mediaType }))
    const stage = await ctx.runMutation(internal.catalog.catalogImageStageCreateMutation, {
      token,
      filename,
      mediaType,
      byteSize: blob.size,
      storageId,
    })
    if (!stage.success) return Response.json(stage, { status: 403 })
    stageId = stage.data.stageId
    const result = await ctx.runAction(internal.catalogImage.catalogImageUploadAction, {
      token,
      stageId: stage.data.stageId,
      storageId,
    })
    return Response.json(result, { status: result.success ? 200 : 400 })
  } catch {
    console.error("Event image HTTP upload failed")
    return Response.json(createResultError(op, "Image upload failed; please try again"), { status: 500 })
  } finally {
    try {
      if (stageId) {
        // The action also cleans up; this covers failures before it starts.
        await ctx.runMutation(internal.catalog.catalogImageStageExpireMutation, { stageId, force: true })
      } else if (storageId) {
        await ctx.storage.delete(storageId)
      }
    } catch {
      // A registered stage still has scheduled expiry as a second chance.
      console.error("Event image HTTP upload cleanup deferred", { stageId })
    }
  }
})
