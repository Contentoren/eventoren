import { v } from "convex/values"
import dayjs from "dayjs"
import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { internalMutation } from "#convex/_generated/server.js"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { createResultError } from "#result"
import type { LoginMethod } from "#src/auth/model_field/loginMethod.ts"
import { loginMethodValidator } from "#src/auth/model_field/loginMethodValidator.ts"
import { tokenValidDurationInDays } from "#src/auth/server/jwt_token/tokenValidDurationInDays.ts"

export type AuthSessionInsertValidatorType = typeof authSessionInsertValidator.type
export const authSessionInsertValidator = v.object({
  userId: vIdUser,
  loginMethod: loginMethodValidator,
  token: v.string(),
})

export const authSessionInsertInternalMutation = internalMutation({
  args: authSessionInsertValidator,
  handler: async (ctx: MutationCtx, args) => {
    const user = await ctx.db.get("users", args.userId)
    if (!user || user.deletedAt) return createResultError("authSessionInsertInternalMutation", "User not found")
    return saveTokenIntoSessionReturnExpiresAtFn(ctx, args.loginMethod, args.userId, args.token)
  },
})

export async function saveTokenIntoSessionReturnExpiresAtFn(
  ctx: MutationCtx,
  loginMethod: LoginMethod,
  userId: Id<"users">,
  token: string,
  now: string = new Date().toISOString(),
): Promise<string> {
  const expiresAt = dayjs(now).add(tokenValidDurationInDays, "days").toISOString()
  await ctx.db.insert("authSessions", {
    userId: userId,
    // data
    loginMethod: loginMethod,
    token,
    // meta dates
    createdAt: now,
    updatedAt: now,
    expiresAt: expiresAt,
  })
  return expiresAt
}
