import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import { generateOtpCode } from "#src/auth/convex/pw/generateOtpCode.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { otpPurposeValidator } from "#src/auth/model_field/otpPurpose.ts"
import { nowIso } from "#utils/date/nowIso.js"

export const otpSaveInternalMutation = internalMutation({
  args: {
    userId: vIdUser,
    email: v.string(),
    purpose: otpPurposeValidator,
  },
  handler: async (ctx, args): PromiseResult<string> => {
    const code = generateOtpCode()

    await ctx.db.insert("authOtps", {
      userId: args.userId,
      name: "",
      email: args.email,
      code,
      purpose: args.purpose,
      createdAt: nowIso(),
      consumedAt: undefined,
    })

    return { success: true, data: code }
  },
})
