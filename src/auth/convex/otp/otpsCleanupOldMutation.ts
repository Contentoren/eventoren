import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { week1timeMs } from "#src/auth/convex/otp/week1timeMs.ts"

export const otpCleanupOldInternalMutation = internalMutation({
  args: {},
  handler: otpCleanupOldFn,
})

export async function otpCleanupOldFn(ctx: MutationCtx): Promise<{ deleted: number }> {
  const oneDayAgo = new Date(Date.now() - week1timeMs).toISOString()

  const oldCodes = await ctx.db
    .query("authOtps")
    .filter((q) => q.lt(q.field("createdAt"), oneDayAgo))
    .collect()

  let deletedCount = 0
  for (const code of oldCodes) {
    await ctx.db.delete("authOtps", code._id)
    deletedCount++
  }

  return { deleted: deletedCount }
}
