import { internalQuery } from "#convex/_generated/server.js"
import { userRoleSource } from "#src/auth/model_field/userRoleSource.ts"

export const authZitadelSyncCandidatesInternalQuery = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect()
    const candidates = []
    for (const user of users) {
      if (user.roleSource !== userRoleSource.zitadel || !user.zitadelUserId || user.deletedAt) continue
      candidates.push({ userId: user._id, zitadelUserId: user.zitadelUserId })
    }
    return candidates
  },
})
