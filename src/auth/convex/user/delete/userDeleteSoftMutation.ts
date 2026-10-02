import { internal } from "#convex/_generated/api.js"
import { internalMutation, type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { findUserByEmailFn } from "#src/auth/convex/crud/findUserByEmailQuery.ts"
import { userDeletionPageRemove } from "#src/auth/convex/user/delete/userDeletionPageRemove.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import {
  type UserDeleteValidatorInternalType,
  userDeleteValidatorInternal,
  userDeleteValidatorPublic,
} from "./userDeleteValidator.js"

export const userDeleteSoftMutation = mutation({
  args: userDeleteValidatorPublic,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, userDeleteSoftMutationFn),
})

export const userDeleteSoftInternalMutation = internalMutation({
  args: userDeleteValidatorInternal,
  handler: userDeleteSoftMutationFn,
})

export async function userDeleteSoftMutationFn(
  ctx: MutationCtx,
  args: UserDeleteValidatorInternalType,
): PromiseResult<null> {
  const op = "userDeleteSoftMutationFn"

  // Find user by ID or email
  let userId = args.userId
  if (!userId && args.email) {
    const user = await findUserByEmailFn(ctx, args.email)
    if (!user) return createResultError(op, "User not found")
    userId = user._id
  }
  if (!userId) return createResultError(op, "Either userId or email must be provided")

  const user = await ctx.db.get("users", userId)
  if (!user) return createResultError(op, "User not found", userId)
  if (user.deletedAt) return createResultError(op, "User already deleted", userId)

  // Mark user as deleted
  const now = new Date().toISOString()
  await ctx.db.patch("users", userId, { deletedAt: now })

  // Tombstoning above revokes access immediately; remove all sessions in bounded pages.
  const next = await userDeletionPageRemove(ctx, { userId, hard: false, phase: "sessions", cursor: null })
  if (next) await ctx.scheduler.runAfter(0, internal.auth.userDeletionContinueInternalMutation, next)

  return createResult(null)
}
