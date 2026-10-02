import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import { otpSaveFn } from "#src/auth/convex/otp/otpSaveFn.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { otpPurposeValidator } from "#src/auth/model_field/otpPurpose.ts"

export const otpSaveInternalMutation = internalMutation({
  args: {
    userId: vIdUser,
    email: v.string(),
    purpose: otpPurposeValidator,
  },
  handler: async (ctx, args): PromiseResult<string> => {
    return otpSaveFn(ctx, args)
  },
})
