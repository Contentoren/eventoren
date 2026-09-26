import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { scannerLinkAdminAuthorizeFn } from "./scannerLinkAdminAuthorizeFn.js"
import { scannerLinkCodeCreate } from "./scannerLinkCodeCreate.js"
import { scannerLinkInputValidate } from "./scannerLinkInputValidate.js"

export const scannerLinkAdminCreateMutation = mutation({
  args: { token: v.string(), name: v.string(), eventKeys: v.array(v.string()), expiresAt: v.number() },
  handler: async (ctx, args): PromiseResult<{ id: Id<"scannerLinks">; code: string }> =>
    authMutationTokenToUserId(ctx, args, async (authorizedCtx, { userId, ...input }) => {
      const admin = await scannerLinkAdminAuthorizeFn(authorizedCtx, userId)
      if (!admin.success) return admin
      const validated = await scannerLinkInputValidate(authorizedCtx.db, input)
      if (!validated.success) return validated
      const code = scannerLinkCodeCreate()
      const id = await authorizedCtx.db.insert("scannerLinks", {
        ...validated.data,
        code,
        role: "organizer",
        createdByUserId: userId,
        createdAt: Date.now(),
      })
      console.info("Scanner organizer link created", { id })
      return createResult({ id, code })
    }),
})
