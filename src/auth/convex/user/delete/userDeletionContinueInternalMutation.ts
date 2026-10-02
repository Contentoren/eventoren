import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { userDeletionPageRemove } from "#src/auth/convex/user/delete/userDeletionPageRemove.ts"
import { userDeletionPendingPhaseRead } from "#src/auth/convex/user/delete/userDeletionPendingPhaseRead.ts"
import { userDeleteHardIdentities } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardIdentities.ts"

export const userDeletionContinueInternalMutation = internalMutation({
  args: {
    userId: vIdUser,
    hard: v.boolean(),
    phase: v.union(
      v.literal("sessions"),
      v.literal("otps"),
      v.literal("codes"),
      v.literal("memberships"),
      v.literal("invitations"),
      v.literal("files"),
      v.literal("accounts"),
      v.literal("identities"),
    ),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await ctx.db.get("users", args.userId)
    if (args.phase === "identities") {
      if (user || !args.hard) return
      const page = await userDeleteHardIdentities(ctx, args.userId, args.cursor)
      if (!page.isDone)
        await ctx.scheduler.runAfter(0, internal.auth.userDeletionContinueInternalMutation, {
          ...args,
          cursor: page.continueCursor,
        })
      return
    }
    if (!user?.deletedAt || (args.hard && !user.hardDeletionStartedAt)) return
    const next = await userDeletionPageRemove(ctx, args)
    if (next) {
      await ctx.scheduler.runAfter(0, internal.auth.userDeletionContinueInternalMutation, next)
      return
    }
    if (!args.hard) return
    const pending = await userDeletionPendingPhaseRead(ctx, args.userId)
    if (pending) {
      await ctx.scheduler.runAfter(0, internal.auth.userDeletionContinueInternalMutation, {
        ...args,
        phase: pending,
        cursor: null,
      })
      return
    }
    await ctx.db.delete("users", args.userId)
    await ctx.scheduler.runAfter(0, internal.auth.userDeletionContinueInternalMutation, {
      ...args,
      phase: "identities",
      cursor: null,
    })
    console.info("userDeletionContinueInternalMutation", { userId: args.userId, status: "cleanup-complete" })
  },
})
