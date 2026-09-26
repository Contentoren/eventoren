import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { scannerLinkAuthorizeFn } from "./scannerLinkAuthorizeFn.js"

export const scannerLinkHelperRevokeMutation = mutation({
  args: { code: v.string(), id: v.id("scannerLinks") },
  handler: async (ctx, { code, id }) => {
    const authorization = await scannerLinkAuthorizeFn(ctx, code)
    if (!authorization.success) return authorization
    if (authorization.data.role !== "organizer")
      return createResultError("scannerLinkHelperRevokeMutation", "Organizer link required")
    const child = await ctx.db.get("scannerLinks", id)
    if (!child || child.role !== "helper" || child.parentId !== authorization.data._id) {
      return createResultError("scannerLinkHelperRevokeMutation", "Helper link not found")
    }
    if (child.revokedAt === undefined) {
      await ctx.db.patch("scannerLinks", id, { revokedAt: Date.now() })
      console.info("Scanner helper link revoked", { id, parentId: child.parentId })
    }
    return createResult({ id })
  },
})
