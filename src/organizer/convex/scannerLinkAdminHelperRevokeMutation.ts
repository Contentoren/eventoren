import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { scannerLinkAdminAuthorizeFn } from "./scannerLinkAdminAuthorizeFn.js"

export const scannerLinkAdminHelperRevokeMutation = mutation({
  args: { token: v.string(), id: v.id("scannerLinks") },
  handler: async (ctx, args) =>
    authMutationTokenToUserId(ctx, args, async (authorizedCtx, { userId, id }) => {
      const admin = await scannerLinkAdminAuthorizeFn(authorizedCtx, userId)
      if (!admin.success) return admin
      const link = await authorizedCtx.db.get("scannerLinks", id)
      if (!link || link.role !== "helper" || !link.parentId) {
        return createResultError("scannerLinkAdminHelperRevokeMutation", "Helper link not found")
      }
      if (link.revokedAt === undefined) {
        await authorizedCtx.db.patch("scannerLinks", id, { revokedAt: Date.now() })
        console.info("Scanner helper link revoked by administrator", { id, parentId: link.parentId })
      }
      return createResult({ id })
    }),
})
