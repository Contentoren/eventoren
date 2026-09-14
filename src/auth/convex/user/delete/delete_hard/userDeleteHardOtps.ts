import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardOtps(ctx: MutationCtx, userId: IdUser): Promise<void> {
  const codes = await ctx.db
    .query("authOtps")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect()

  await Promise.all(codes.map((code) => ctx.db.delete("authOtps", code._id)))
}
