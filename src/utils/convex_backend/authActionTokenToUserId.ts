import type { ActionCtx } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function authActionTokenToUserId<T extends { token: string }, R>(
  ctx: ActionCtx,
  args: T,
  fn: (ctx: ActionCtx, data: Omit<T, "token"> & { userId: IdUser }) => PromiseResult<R>,
): PromiseResult<R> {
  const op = "authActionTokenToUserId"
  if (!args.token) return createResultError(op, "missing token")
  const activeUser = await ctx.runQuery(internal.auth.authCurrentUserByTokenInternalQuery, { token: args.token })
  if (!activeUser.success) return activeUser
  const userId = activeUser.data._id as IdUser
  const { token, ...data } = args
  const newData = { ...data, userId }
  return fn(ctx, newData)
}
