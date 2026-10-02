import { paginationOptsValidator } from "convex/server"
import { internalQuery } from "#convex/_generated/server.js"
import { userRoleSource } from "#src/auth/model_field/userRoleSource.ts"

export const authZitadelSyncCandidatesInternalQuery = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("roleSource", (q) => q.eq("roleSource", userRoleSource.zitadel))
      .paginate(args.paginationOpts)
    const candidates = []
    for (const user of users.page) {
      if (user.roleSource !== userRoleSource.zitadel || !user.zitadelUserId || user.deletedAt) continue
      candidates.push({ userId: user._id, zitadelUserId: user.zitadelUserId })
    }
    return { ...users, page: candidates }
  },
})
