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

export const userDeleteHardMutation = mutation({
  args: userDeleteValidatorPublic,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, userDeleteHardMutationFn),
})

export const userDeleteHardInternalMutation = internalMutation({
  args: userDeleteValidatorInternal,
  handler: userDeleteHardMutationFn,
})

export async function userDeleteHardMutationFn(
  ctx: MutationCtx,
  args: UserDeleteValidatorInternalType,
): PromiseResult<null> {
  const op = "userDeleteHardMutationFn"

  // Find user by ID or email
  let userId = args.userId
  if (!userId && args.email) {
    const user = await findUserByEmailFn(ctx, args.email)
    if (!user) return createResult(null) // idempotent - user not found
    userId = user._id
  }

  if (!userId) return createResultError(op, "Either userId or email must be provided")

  const user = await ctx.db.get("users", userId)
  if (!user || user.hardDeletionStartedAt) return createResult(null)

  // Revoke access atomically before asynchronous physical cleanup. Keep the
  // identity/account tombstone until every dependent phase has completed.
  const now = new Date().toISOString()
  await ctx.db.patch("users", userId, { deletedAt: user.deletedAt ?? now, hardDeletionStartedAt: now })
  const next = await userDeletionPageRemove(ctx, { userId, hard: true, phase: "sessions", cursor: null })
  if (next) await ctx.scheduler.runAfter(0, internal.auth.userDeletionContinueInternalMutation, next)
  console.info(op, { userId, status: "cleanup-scheduled" })

  return createResult(null)
}
