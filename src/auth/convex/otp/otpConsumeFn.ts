import type { MutationCtx } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import type { IdAuthOtp } from "#src/auth/convex/IdUser.ts"
import { nowIso } from "#utils/date/nowIso.js"

export async function otpConsumeFn(ctx: MutationCtx, args: { otpId: IdAuthOtp }): PromiseResult<void> {
  const op = "otpCodeConsumeFn"
  const { otpId } = args

  await ctx.db.patch("authOtps", otpId, { consumedAt: nowIso() })

  return { success: true, data: undefined }
}
