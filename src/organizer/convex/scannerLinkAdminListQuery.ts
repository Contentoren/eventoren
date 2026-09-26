import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { scannerLinkAdminAuthorizeFn } from "./scannerLinkAdminAuthorizeFn.js"

export const scannerLinkAdminListQuery = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, paginationOpts }) => {
      const admin = await scannerLinkAdminAuthorizeFn(authorizedCtx, userId)
      if (!admin.success) return admin
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) {
        return createResultError("scannerLinkAdminListQuery", "Page size must be 1–50")
      }
      const page = await authorizedCtx.db
        .query("scannerLinks")
        .withIndex("roleAndCreatedAt", (q) => q.eq("role", "organizer"))
        .order("desc")
        .paginate({ ...paginationOpts, maximumRowsRead: 50, maximumBytesRead: 512 * 1024 })
      return createResult(page)
    }),
})
