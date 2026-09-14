import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { otpSaveFn } from "#src/auth/convex/otp/otpSaveFn.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { otpPurpose } from "#src/auth/model_field/otpPurpose.ts"

const userPasswordChange1RequestValidator = v.object({
  userId: vIdUser,
  email: v.string(),
  purpose: v.string(),
})

export type UserPasswordChange1RequestValidatorType = typeof userPasswordChange1RequestValidator.type

export const userPasswordChange1RequestInternalMutation = internalMutation({
  args: userPasswordChange1RequestValidator,
  handler: async (ctx, args): PromiseResult<string> => {
    const otpSaveResult = await otpSaveFn(ctx, {
      userId: args.userId as IdUser,
      email: args.email,
      purpose: otpPurpose.passwordChange,
    })
    if (!otpSaveResult.success) return otpSaveResult
    return { success: true, data: otpSaveResult.data }
  },
})
