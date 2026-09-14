import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createError, type PromiseResult } from "#result"
import type { DocAuthOtp } from "#src/auth/convex/IdUser.ts"
import type { OtpPurpose } from "#src/auth/model_field/otpPurpose.ts"

export async function otpFindFn(
  ctx: QueryCtx | MutationCtx,
  args: { email: string; code: string; purpose: OtpPurpose },
): PromiseResult<DocAuthOtp> {
  const op = "otpCodeFindFn"
  const { email, code, purpose } = args

  const otpRecord = await ctx.db
    .query("authOtps")
    .withIndex("emailCode", (q) => q.eq("email", email).eq("code", code))
    .filter((q) => q.eq(q.field("purpose"), purpose))
    .filter((q) => q.eq(q.field("consumedAt"), undefined))
    .first()

  if (!otpRecord) {
    return createError(op, "Invalid or expired code")
  }

  return { success: true, data: otpRecord }
}
