import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { scannerLinkAdminAuthorizeFn } from "./scannerLinkAdminAuthorizeFn.js"
import { scannerLinkCodeCreate } from "./scannerLinkCodeCreate.js"
import { scannerLinkInputValidate } from "./scannerLinkInputValidate.js"

export const scannerLinkAdminHelperCreateMutation = mutation({
  args: {
    token: v.string(),
    parentId: v.id("scannerLinks"),
    name: v.string(),
    eventKeys: v.array(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): PromiseResult<{ id: Id<"scannerLinks">; code: string }> =>
    authMutationTokenToUserId(ctx, args, async (authorizedCtx, { userId, parentId, ...input }) => {
      const admin = await scannerLinkAdminAuthorizeFn(authorizedCtx, userId)
      if (!admin.success) return admin
      const parent = await authorizedCtx.db.get("scannerLinks", parentId)
      if (!parent || parent.role !== "organizer" || parent.parentId) {
        return createResultError("scannerLinkAdminHelperCreateMutation", "Organizer link not found")
      }
      if (parent.revokedAt !== undefined || parent.expiresAt <= Date.now()) {
        return createResultError("scannerLinkAdminHelperCreateMutation", "Organizer link is unavailable")
      }
      const validated = await scannerLinkInputValidate(authorizedCtx.db, input, parent.eventKeys, parent.expiresAt)
      if (!validated.success) return validated
      const code = scannerLinkCodeCreate()
      const id = await authorizedCtx.db.insert("scannerLinks", {
        ...validated.data,
        code,
        role: "helper",
        parentId,
        createdByUserId: userId,
        createdAt: Date.now(),
      })
      console.info("Scanner helper link created by administrator", { id, parentId })
      return createResult({ id, code })
    }),
})
