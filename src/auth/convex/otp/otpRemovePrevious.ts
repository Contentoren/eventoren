import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import type { OtpPurpose } from "#src/auth/model_field/otpPurpose.ts"

export async function otpRemovePreviousFn(
  ctx: MutationCtx,
  args: { userId: IdUser; email: string; purpose: OtpPurpose },
): Promise<void> {
  const { userId, email, purpose } = args

  const existingCodes = await ctx.db
    .query("authOtps")
    .filter((q) => q.eq(q.field("userId"), userId))
    .filter((q) => q.eq(q.field("email"), email))
    .filter((q) => q.eq(q.field("purpose"), purpose))
    .filter((q) => q.eq(q.field("consumedAt"), undefined))
    .collect()

  for (const code of existingCodes) {
    await ctx.db.delete("authOtps", code._id)
  }
}
