import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"

export const catalogImageStageExpireMutation = internalMutation({
  args: { stageId: v.id("catalogImageStages"), force: v.optional(v.boolean()) },
  handler: async (ctx, { stageId, force }) => {
    const stage = await ctx.db.get("catalogImageStages", stageId)
    if (!stage || (!force && stage.expiresAt > Date.now())) return
    if (stage.storageId) await ctx.storage.delete(stage.storageId)
    await ctx.db.delete("catalogImageStages", stageId)
    console.info("Event image stage cleaned", { stageId })
  },
})
