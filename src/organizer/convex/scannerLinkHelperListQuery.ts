import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { scannerLinkAuthorizeFn } from "./scannerLinkAuthorizeFn.js"

export const scannerLinkHelperListQuery = query({
  args: { code: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { code, paginationOpts }) => {
    const authorization = await scannerLinkAuthorizeFn(ctx, code)
    if (!authorization.success) return authorization
    if (authorization.data.role !== "organizer")
      return createResultError("scannerLinkHelperListQuery", "Organizer link required")
    if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) {
      return createResultError("scannerLinkHelperListQuery", "Page size must be 1–50")
    }
    const page = await ctx.db
      .query("scannerLinks")
      .withIndex("parentIdAndCreatedAt", (q) => q.eq("parentId", authorization.data._id))
      .order("desc")
      .paginate({ ...paginationOpts, maximumRowsRead: 50, maximumBytesRead: 512 * 1024 })
    return createResult(page)
  },
})
