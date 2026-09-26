import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { scannerLinkAdminAuthorizeFn } from "./scannerLinkAdminAuthorizeFn.js"

export const scannerLinkAdminRevokeMutation = mutation({
  args: { token: v.string(), id: v.id("scannerLinks") },
  handler: async (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (authorizedCtx, { userId, id }) => {
      const admin = await scannerLinkAdminAuthorizeFn(authorizedCtx, userId)
      if (!admin.success) return admin
      const link = await authorizedCtx.db.get("scannerLinks", id)
      if (!link || link.role !== "organizer")
        return createResultError("scannerLinkAdminRevokeMutation", "Link not found")
      if (link.revokedAt === undefined) {
        await authorizedCtx.db.patch("scannerLinks", id, { revokedAt: Date.now() })
        console.info("Scanner organizer link revoked", { id })
      }
      return createResult({ id })
    }),
})
