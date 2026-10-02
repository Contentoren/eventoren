import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardAuthAccounts(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .paginate({ cursor, numItems: 100 })

  for (const account of accounts.page) {
    await ctx.db.insert("authDeletionIdentities", {
      userId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    })
    await ctx.db.delete("authAccounts", account._id)
  }
  return { isDone: accounts.isDone, continueCursor: accounts.continueCursor }
}
