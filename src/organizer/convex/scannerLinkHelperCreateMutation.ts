import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { scannerLinkAuthorizeFn } from "./scannerLinkAuthorizeFn.js"
import { scannerLinkCodeCreate } from "./scannerLinkCodeCreate.js"
import { scannerLinkInputValidate } from "./scannerLinkInputValidate.js"

export const scannerLinkHelperCreateMutation = mutation({
  args: { code: v.string(), name: v.string(), eventKeys: v.array(v.string()), expiresAt: v.number() },
  handler: async (ctx, { code, ...input }) => {
    const authorization = await scannerLinkAuthorizeFn(ctx, code)
    if (!authorization.success) return authorization
    const parent = authorization.data
    if (parent.role !== "organizer")
      return createResultError("scannerLinkHelperCreateMutation", "Organizer link required")
    const validated = await scannerLinkInputValidate(ctx.db, input, parent.eventKeys, parent.expiresAt)
    if (!validated.success) return validated
    const helperCode = scannerLinkCodeCreate()
    const id = await ctx.db.insert("scannerLinks", {
      ...validated.data,
      code: helperCode,
      role: "helper",
      parentId: parent._id,
      createdAt: Date.now(),
    })
    console.info("Scanner helper link created", { id, parentId: parent._id })
    return createResult({ id, code: helperCode })
  },
})
