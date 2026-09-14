import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { createError, type PromiseResult } from "#result"
import { saveTokenIntoSessionReturnExpiresAtFn } from "#src/auth/convex/crud/saveTokenIntoSessionReturnExpiresAtMutation.ts"
import type { DocUser } from "#src/auth/convex/IdUser.ts"
import { otpConsumeFn } from "#src/auth/convex/otp/otpConsumeFn.ts"
import { otpFindFn } from "#src/auth/convex/otp/otpFindFn.ts"
import { docUserToUserProfile } from "#src/auth/convex/user/docUserToUserProfile.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import { loginMethod } from "#src/auth/model_field/loginMethod.ts"
import { otpPurpose } from "#src/auth/model_field/otpPurpose.ts"
import { createTokenResult } from "#src/auth/server/jwt_token/createTokenResult.ts"
import { orgMemberGetHandleAndRoleFn } from "#src/org/member_convex/orgMemberGetHandleAndRoleInternalQuery.ts"
import { nowIso } from "#utils/date/nowIso.js"

export type signInViaEmailEnterOtp2ValidatorType = typeof signInViaEmailEnterOtp2Validator.type
export const signInViaEmailEnterOtp2Validator = v.object({
  email: v.string(),
  code: v.string(),
})

export const signInViaEmailEnterOtp2InternalMutation = internalMutation({
  args: signInViaEmailEnterOtp2Validator,
  handler: signInViaEmailEnterOtp2InternalMutationFn,
})

export async function signInViaEmailEnterOtp2InternalMutationFn(
  ctx: MutationCtx,
  args: signInViaEmailEnterOtp2ValidatorType,
): PromiseResult<UserSession> {
  const op = "signInConfirm2MutationFn"
  const { email, code } = args

  const otpFindResult = await otpFindFn(ctx, {
    email,
    code,
    purpose: otpPurpose.signIn,
  })
  if (!otpFindResult.success) {
    return createError(op, otpFindResult.errorMessage || "Invalid code")
  }
  const otpRecord = otpFindResult.data

  const { userId } = otpRecord

  const user = await ctx.db.get("users", userId)
  if (!user) {
    return createError(op, "User not found", userId)
  }

  if (user.deletedAt) {
    return createError(op, "User account has been deleted")
  }

  const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, userId)

  const userProfile = docUserToUserProfile(user as DocUser, orgHandle, orgRole)

  const tokenResult = await createTokenResult(userId, orgHandle, orgRole)
  if (!tokenResult.success) return tokenResult
  const token = tokenResult.data

  const expiresAt = await saveTokenIntoSessionReturnExpiresAtFn(ctx, loginMethod.email, userId, token)

  await otpConsumeFn(ctx, { otpId: otpRecord._id })

  const userSession: UserSession = {
    token,
    profile: userProfile,
    hasPw: !!user.hashedPassword,
    signedInMethod: loginMethod.email,
    signedInAt: nowIso(),
    expiresAt,
  }

  return { success: true, data: userSession }
}
