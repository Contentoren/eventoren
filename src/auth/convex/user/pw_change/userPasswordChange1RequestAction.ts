import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { type ActionCtx, action, internalAction } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import { envBaseUrlAppResult } from "#src/app/env/public/envBaseUrlAppResult.ts"
import { languageValidator } from "#src/app/i18n/language.ts"
import { sendEmailChangePassword } from "#src/auth/convex/email/sendEmailChangePassword.ts"
import type { DocUser } from "#src/auth/convex/IdUser.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { otpPurpose } from "#src/auth/model_field/otpPurpose.ts"
import { pageRouteAuth } from "#src/auth/url/pageRouteAuth.ts"
import { authActionTokenToUserId } from "#src/utils/convex_backend/authActionTokenToUserId.ts"
import { createErrorAndLogError } from "#src/utils/convex_backend/createErrorAndLogError.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"

export const userPasswordChange1RequestFieldsBase = {
  l: languageValidator,
} as const

export const userPasswordChange1RequestValidatorPublic = createTokenValidator(userPasswordChange1RequestFieldsBase)
export type UserPasswordChange1RequestTypePublic = typeof userPasswordChange1RequestValidatorPublic.type

export const userPasswordChange1RequestValidatorInternal = v.object({
  ...userPasswordChange1RequestFieldsBase,
  userId: vIdUser,
})

export type UserPasswordChange1RequestTypeInternal = typeof userPasswordChange1RequestValidatorInternal.type

export const userPasswordChange1RequestAction = action({
  args: userPasswordChange1RequestValidatorPublic,
  handler: async (ctx, args) => authActionTokenToUserId(ctx, args, userPasswordChange1RequestActionFn),
})

export const userPasswordChange1RequestInternalAction = internalAction({
  args: userPasswordChange1RequestValidatorInternal,
  handler: userPasswordChange1RequestActionFn,
})

async function userPasswordChange1RequestActionFn(
  ctx: ActionCtx,
  args: UserPasswordChange1RequestTypeInternal,
): PromiseResult<null> {
  const op = "userPasswordChange1RequestActionFn"

  const user: DocUser | null = await ctx.runQuery(internal.auth.userGetInternalQuery, {
    userId: args.userId,
  })
  if (!user) {
    return createErrorAndLogError(op, "User not found")
  }

  if (!user.email) {
    return createErrorAndLogError(op, "User email not found")
  }

  const otpResult = await ctx.runMutation(internal.auth.otpSaveInternalMutation, {
    userId: args.userId,
    email: user.email,
    purpose: otpPurpose.passwordChange,
  })
  if (!otpResult.success) return otpResult
  const otp = otpResult.data

  const baseUrlResult = envBaseUrlAppResult()
  if (!baseUrlResult.success) {
    return baseUrlResult
  }
  const baseUrl = baseUrlResult.data

  const confirmUrl = new URL(pageRouteAuth.userProfileMeChangePassword, baseUrl)
  confirmUrl.searchParams.set("code", otp)
  confirmUrl.searchParams.set("step", "2")
  const url = confirmUrl.toString()

  const sendResult = await sendEmailChangePassword(user.name, user.email, otp, url, args.l)
  if (!sendResult.success) {
    return sendResult
  }

  return { success: true, data: null }
}
